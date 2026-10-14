import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { db } from '../../database/services/db';

/**
 * Title of the root test directory. Everything the self-test creates
 * lives under /__test__, so it can be found and purged by this title.
 */
const TEST_TITLE = '__test__';

@Injectable({
  providedIn: 'root',
})
export class DebugService {
  /**
   * Self-test of the core: runs inside the real database,
   * in the /__test__ directory, and cleans up after itself.
   * Triggered by the `test` terminal command.
   */
  constructor(private core: CoreService) {}

  /**
   * Run the full scenario and return a printable report
   */
  public async selfTest(): Promise<string> {
    const lines: string[] = [];
    let passed = 0;
    let failed = 0;

    const check = (name: string, ok: boolean, info = '') => {
      ok ? passed++ : failed++;
      lines.push(`${ok ? '✔' : '✖'} ${name}${!ok && info ? ' — ' + info : ''}`);
    };

    /**
     * Refuse to run over leftovers of a previous run
     */
    const leftovers = await this.findTestRoots();
    if (leftovers.length > 0) {
      return (
        `(!) /${TEST_TITLE} already exists (leftover of a previous run).\n` +
        `    Run "test clean" to remove it, then "test" again.`
      );
    }

    /**
     * Ids of all test directories, needed for cleanup even if the test fails halfway
     */
    let root = '';
    let a = '';
    let b = '';
    let deep = '';

    try {
      /**
       * STRUCTURE
       * /__test__
       *   ├─ a
       *   │   └─ deep
       *   └─ b
       */
      root = String(await this.core.mkdir('/', '🧪', TEST_TITLE, ['Front', 'Back']));
      a = String(await this.core.mkdir(root, '📁', 'a', ['Q', 'A']));
      b = String(await this.core.mkdir(root, '📁', 'b', ['Q', 'A']));
      deep = String(await this.core.mkdir(a, '📁', 'deep', ['Q', 'A']));
      const dirIds = [root, a, b, deep];

      const rootDirs = await this.core.lsdir('/', 0);
      check('mkdir: test root is listed in /', rootDirs.some((d) => d.id === root));

      const rootChildren = (await this.core.lsdir(root, 0)).map((d) => d.title).sort();
      check(
        'mkdir: nested dirs are listed in their owner',
        rootChildren.join() === 'a,b',
        `got [${rootChildren}]`
      );

      const aChildren = (await this.core.lsdir(a, 0)).map((d) => d.title);
      check('mkdir: second level nesting', aChildren.join() === 'deep', `got [${aChildren}]`);

      const rootRow = await db.directory.get(root as any);
      check(
        'mkdir: fields are stored',
        rootRow?.fields.join() === 'Front,Back' && rootRow?.icon === '🧪',
        JSON.stringify(rootRow)
      );

      /**
       * CARDS
       */
      await this.core.touch(['q1', 'a1'], a);
      await this.core.touch(['q2', 'a2'], a);
      await this.core.touch(['q3', 'a3'], deep);
      await this.core.touch(['q4', 'a4'], b);
      await this.core.touch(['q5', 'a5', 'extra'], root);

      const countIn = (owner: string) => db.card.where('owner').equals(owner).count();
      check('touch: 2 cards in a', (await countIn(a)) === 2, `got ${await countIn(a)}`);
      check('touch: 1 card in deep', (await countIn(deep)) === 1);
      check('touch: 1 card in b', (await countIn(b)) === 1);
      check('touch: 1 card in test root', (await countIn(root)) === 1);

      const lsCards = await this.core.ls(a, 0);
      check('ls: lists cards of a directory', lsCards.length === 2, `got ${lsCards.length}`);

      const threeSides = (await this.core.ls(root, 0))[0];
      check(
        'touch: status matrix matches amount of sides',
        threeSides?.contents.length === 3 && threeSides?.spec.status.length === 3,
        JSON.stringify(threeSides?.spec)
      );

      const rootCardsBefore = await countIn('/');
      await this.core.touch(['should', 'not exist'], '/');
      check(
        'touch: refuses to create cards in root',
        (await countIn('/')) === rootCardsBefore
      );

      /**
       * INTEGRITY: no card without an existing parent directory
       */
      const testCards = await db.card.where('owner').anyOf(dirIds).toArray();
      check(
        'integrity: every card has an existing owner dir',
        testCards.length === 5 && testCards.every((c) => dirIds.includes(c.owner)),
        `cards: ${testCards.length}`
      );
      const testDirs = await db.directory.where('owner').anyOf([root, a, b, deep]).toArray();
      check(
        'integrity: every nested dir has an existing owner dir',
        testDirs.length === 3 && testDirs.every((d) => dirIds.includes(d.owner))
      );

      /**
       * REMOVE: dir goes away, and all its content goes with it
       */
      await this.core.removeDir(root);
      check('rmdir: removed dir is gone', (await db.directory.get(root as any)) === undefined);

      const orphanDirs = await db.directory.where('owner').anyOf(dirIds).count();
      check(
        'rmdir: no subdirectories left without a parent',
        orphanDirs === 0,
        `${orphanDirs} orphan dir(s)`
      );

      const orphanCards = await db.card.where('owner').anyOf(dirIds).count();
      check(
        'rmdir: no cards left without a parent',
        orphanCards === 0,
        `${orphanCards} orphan card(s)`
      );
    } catch (e: any) {
      check('unexpected error', false, e?.message ?? String(e));
    } finally {
      /**
       * CLEANUP: always, even when something above has failed
       */
      await this.purge([root, a, b, deep].filter((id) => id !== ''));
      const left = await this.findTestRoots();
      check('cleanup: no test directories left in /', left.length === 0);
    }

    lines.push('');
    lines.push(`${passed} passed, ${failed} failed`);
    return lines.join('\n');
  }

  /**
   * Remove /__test__ left by a previous (probably crashed) run
   */
  public async cleanTest(): Promise<string> {
    const roots = await this.findTestRoots();
    if (roots.length === 0) return 'Nothing to clean';
    await this.purge(roots);
    return `Removed ${roots.length} test director${roots.length === 1 ? 'y' : 'ies'} with all content`;
  }

  /**
   * Test directories in the root, found by reserved title
   */
  private async findTestRoots(): Promise<string[]> {
    const dirs = await db.directory
      .where('owner')
      .equals('/')
      .filter((d) => d.title === TEST_TITLE)
      .toArray();
    return dirs.map((d) => d.id);
  }

  /**
   * Delete given directories and everything below them (dirs and cards).
   * Walks down by owner links, so it works even for orphans whose parent is already gone
   */
  private async purge(ids: string[]) {
    const all = new Set<string>(ids);
    let frontier = [...ids];
    while (frontier.length > 0) {
      const children = await db.directory.where('owner').anyOf(frontier).toArray();
      frontier = children.map((d) => d.id).filter((id) => !all.has(id));
      frontier.forEach((id) => all.add(id));
    }
    const list = [...all];
    await db.card.where('owner').anyOf(list).delete();
    await db.directory.bulkDelete(list as any);
  }
}
