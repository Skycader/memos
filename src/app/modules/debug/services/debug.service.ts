import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { db } from '../../database/services/db';
import { MathService } from '../../math/services/math.service';
import { FontService } from '../../core/services/font.service';
import { ThemeService } from '../../core/services/theme.service';
import { COMMANDS } from '../../terminal/commands';
import { ShellRunner } from '../../terminal/commands/command';
import { TerminalService } from '../../terminal/services/terminal.service';
import { tokenize } from '../../terminal/services/tokenizer';
import { DoctorService } from './doctor.service';

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
  constructor(
    private core: CoreService,
    private doctor: DoctorService,
    private math: MathService,
    private theme: ThemeService,
    private font: FontService,
    private terminal: TerminalService
  ) {}

  /**
   * Run the full scenario and return a printable report
   * @param shell runs command lines and completes them like the terminal does,
   * without it the terminal scenario is skipped
   */
  public async selfTest(shell?: ShellRunner): Promise<string> {
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
    /**
     * Same for the doctor scenario: ids of its directories and cards,
     * and whether /lost+found was created by this very test
     */
    let root2 = '';
    let stray = '';
    let strayCards: string[] = [];
    let lostFoundIsOurs = false;
    /**
     * Root of the uniqueness and ids scenario
     */
    let root3 = '';
    /**
     * Root of the terminal scenario, and where the user was before it
     */
    let root4 = '';
    const userPath = this.terminal.getPath();

    try {
      /**
       * TOKENIZER: splitting a command line into words
       */
      const cases: [string, string[] | 'error'][] = [
        ['mkdir 🇫🇷 French A B', ['mkdir', '🇫🇷', 'French', 'A', 'B']],
        ['touch "Un chat" "A cat"', ['touch', 'Un chat', 'A cat']],
        ["touch l'ami friend", ['touch', "l'ami", 'friend']],
        ["touch 'l'ami' friend", ['touch', "l'ami", 'friend']],
        ['touch "say \\"hi\\""', ['touch', 'say "hi"']],
        ['touch "" x', ['touch', '', 'x']],
        ['touch a\\ b', ['touch', 'a b']],
        ['  ls   ', ['ls']],
        ['', []],
        ['touch "Un chat', 'error'],
      ];
      const badCases = cases.filter(([line, expected]) => {
        try {
          return JSON.stringify(tokenize(line)) !== JSON.stringify(expected);
        } catch {
          return expected !== 'error';
        }
      });
      check(
        'tokenizer: quotes, apostrophes, escapes and empty words',
        badCases.length === 0,
        badCases.map(([line]) => line).join(' | ')
      );

      /**
       * REGISTRY: every command is callable and described
       */
      const names = COMMANDS.flatMap((command) => [command.name, ...(command.aliases ?? [])]);
      check(
        'registry: names and aliases are unique',
        new Set(names).size === names.length,
        names.join()
      );
      check(
        'registry: every command has usage and description',
        COMMANDS.every((command) => command.usage.startsWith(command.name) && command.description)
      );
      /**
       * THEME: switch both ways, then put the user's theme back
       */
      const userTheme = this.theme.current;
      const attr = () => document.documentElement.getAttribute('data-theme');
      this.theme.set('dark');
      const darkOk = attr() === 'dark' && localStorage.getItem('memos.theme') === 'dark';
      this.theme.set('light');
      const lightOk = attr() === 'light' && localStorage.getItem('memos.theme') === 'light';
      this.theme.set(userTheme);
      check('theme: dark and light are applied and remembered', darkOk && lightOk);

      /**
       * FONT: switch both ways, the font file must really load, then put the user's font back
       */
      const userFont = this.font.current;
      const fontAttr = () => document.documentElement.getAttribute('data-font');
      this.font.set('JetBrainsMono');
      const jbApplied =
        fontAttr() === 'JetBrainsMono' &&
        localStorage.getItem('memos.font') === 'JetBrainsMono' &&
        getComputedStyle(document.documentElement).getPropertyValue('--font').includes('JetBrains Mono');
      let jbLoaded = false;
      try {
        jbLoaded = (await document.fonts.load('13px "JetBrains Mono"')).length > 0;
      } catch {
        /** the file could not be fetched */
      }
      this.font.set('default');
      const defaultApplied =
        fontAttr() === 'default' && localStorage.getItem('memos.font') === 'default';
      this.font.set(userFont);
      check(
        'font: JetBrainsMono and default are applied and remembered',
        jbApplied && defaultApplied,
        `jb: ${jbApplied}, default: ${defaultApplied}`
      );
      check('font: the JetBrains Mono file loads', jbLoaded);
      check(
        'font: names are found ignoring case',
        this.font.find('jetbrainsmono') === 'JetBrainsMono' && this.font.find('comic') === undefined
      );

      /**
       * SCHEMA
       */
      const dirIndexes = db.directory.schema.indexes.map((index) => index.name);
      const cardIndexes = db.card.schema.indexes.map((index) => index.name);
      check(
        'db: schema has [owner+title] and no indexes over arrays',
        db.verno >= 2 &&
          dirIndexes.includes('[owner+title]') &&
          !dirIndexes.includes('fields') &&
          !cardIndexes.includes('contents'),
        `v${db.verno}, directory: [${dirIndexes}], card: [${cardIndexes}]`
      );

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

      /**
       * DOCTOR: simulate an interrupted removal, when the parent is already
       * gone but its content is left behind. The scan is run over the real
       * database, so only the test's own orphans are looked at and moved.
       */
      lostFoundIsOurs = (await this.doctor.findLostFound()) === null;
      root2 = String(await this.core.mkdir('/', '🧪', TEST_TITLE, []));
      stray = String(await this.core.mkdir(root2, '📁', 'stray', []));
      await this.core.touch(['inside', 'hanging dir'], stray);
      await this.core.touch(['direct', 'hanging card'], root2);
      strayCards = (await db.card.where('owner').anyOf([stray, root2]).toArray()).map(
        (card) => card.id
      );
      // raw delete of the parent only: this is what an interrupted rmdir would leave
      await db.directory.delete(root2 as any);

      const scan = await this.doctor.scan();
      const myDirs = scan.orphanDirs.filter((dir) => dir.id === stray);
      const myCards = scan.orphanCards.filter((card) => card.owner === root2);
      check(
        'doctor: finds a directory hanging without a parent',
        myDirs.length === 1 && myDirs[0].cards === 1 && myDirs[0].subdirs === 0,
        JSON.stringify(myDirs)
      );
      check('doctor: finds a card hanging without a parent', myCards.length === 1);

      const moved = await this.doctor.moveToLostFound({
        ...scan,
        orphanDirs: myDirs,
        orphanCards: myCards,
      });
      const lostFound = await this.doctor.findLostFound();
      check(
        'doctor fix: moves orphans to /lost+found',
        moved.dirs === 1 &&
          moved.cards === 1 &&
          lostFound !== null &&
          (await db.directory.get(stray as any))?.owner === lostFound &&
          (await db.card.where('owner').equals(lostFound).count()) >= 1,
        JSON.stringify(moved)
      );

      const after = await this.doctor.scan();
      check(
        'doctor fix: nothing of the test hangs anymore',
        !after.orphanDirs.some((dir) => dir.id === stray) &&
          !after.orphanCards.some((card) => strayCards.includes(card.id))
      );

      /**
       * TERMINAL: whole command lines, through the tokenizer and the registry,
       * exactly as typed. Runs in root, the user's directory is put back at the end
       */
      if (shell) {
        const run = (line: string) => shell.capture(line);

        await run('cd /');
        const made = await run(`mkdir 🧪 ${TEST_TITLE} Front Back`);
        check('terminal: mkdir prints nothing on success', made.out === '' && made.err === '', JSON.stringify(made));
        root4 = (await this.core.lsdir('/', 0)).find((dir) => dir.title === TEST_TITLE)?.id ?? '';

        await run(`cd ${TEST_TITLE}`);
        await run('mkdir 📁 "Sub Dir" Q A');
        /** Tab completion, with the directories created above next to us */
        const tab = async (typed: string) => (await shell.complete(typed)).buffer;
        const tabOptions = async (typed: string) => (await shell.complete(typed)).options;
        check(
          'tab: completes a command name',
          (await tab('fo')) === 'font ' && (await tab('th')) === 'theme ',
          `${await tab('fo')} | ${await tab('th')}`
        );
        check(
          'tab: lists the options when a name is ambiguous',
          (await tabOptions('d')).sort().join() === 'dir,doctor,drop',
          (await tabOptions('d')).join()
        );
        check(
          'tab: completes the argument of a command to the end (font J -> JetBrainsMono)',
          (await tab('font J')) === 'font JetBrainsMono' &&
            (await tab('font jet')) === 'font JetBrainsMono' &&
            (await tab('theme d')) === 'theme dark' &&
            (await tab('doctor f')) === 'doctor fix'
        );
        check(
          'tab: completes a directory name, quoting it when it has spaces',
          (await tab('cd Sub')) === 'cd "Sub Dir"' && (await tab(`cd /${TEST_TITLE.slice(0, 4)}`)) === `cd /${TEST_TITLE}`,
          `${await tab('cd Sub')} | ${await tab(`cd /${TEST_TITLE.slice(0, 4)}`)}`
        );
        check(
          'tab: leaves the text alone when there is nothing to complete',
          (await tab('font zzz')) === 'font zzz' && (await tab('frobnicate')) === 'frobnicate'
        );

        /** bare font and theme show the current value and what is available */
        const fontInfo = (await run('font')).out;
        const themeInfo = (await run('theme')).out;
        check(
          'font and theme without arguments show the current value and the available ones',
          fontInfo.includes('Font: ') &&
            fontInfo.includes('Available: default, JetBrainsMono') &&
            themeInfo.includes('Theme: ') &&
            themeInfo.includes('Available: dark, light'),
          `${fontInfo} | ${themeInfo}`
        );

        await run('cd "Sub Dir"');
        const where = (await run('pwd')).out;
        check('terminal: cd into a name with spaces (quotes)', where === `/${TEST_TITLE}/Sub Dir`, where);

        await run('touch "Un chat" "A cat"');
        const listed = (await run('ls')).out;
        check(
          'terminal: touch keeps quoted sides with spaces as single sides',
          listed.includes('[Un chat,A cat]'),
          listed
        );

        await run('cd ../..');
        check('terminal: cd ../.. goes up two levels', (await run('pwd')).out === '/');
        await run(`cd "/${TEST_TITLE}/Sub Dir"`);
        check(
          'terminal: cd by absolute path',
          (await run('pwd')).out === `/${TEST_TITLE}/Sub Dir`
        );
        await run('cd /');
        await run(`cd ${TEST_TITLE}/Sub\\ Dir`);
        check(
          'terminal: cd by relative path with several parts',
          (await run('pwd')).out === `/${TEST_TITLE}/Sub Dir`
        );

        const lost = await run('cd nowhere');
        check(
          'terminal: cd into a missing directory is an error and stays in place',
          lost.err.includes('does not exist') && (await run('pwd')).out === `/${TEST_TITLE}/Sub Dir`,
          lost.err
        );
        check(
          'terminal: unknown command is an error',
          (await run('frobnicate')).err.includes('not found')
        );
        check('terminal: unclosed quote is an error', (await run('touch "a')).err.includes('quote'));

        await run('cd /');
        const rootTouch = await run('touch x y');
        check(
          'terminal: touch in root says why it refused',
          rootTouch.err.includes('root'),
          rootTouch.err
        );

        const helpText = (await run('help')).out;
        check(
          'terminal: help lists every command from the registry',
          COMMANDS.every((command) => helpText.includes(command.usage)),
          COMMANDS.filter((command) => !helpText.includes(command.usage)).map((c) => c.name).join()
        );

        /** remove the tree while standing inside it: the session has to step out */
        await run(`cd "/${TEST_TITLE}/Sub Dir"`);
        const removedOut = (await run(`rmdir ${root4}`)).out;
        check(
          'terminal: rmdir removes the whole tree',
          removedOut.includes('Removed 2'),
          removedOut
        );
        check(
          'terminal: after rmdir of the current directory the session steps out',
          (await run('pwd')).out === '/'
        );
      }

      /**
       * UNIQUE TITLES
       */
      root3 = String(await this.core.mkdir('/', '🧪', TEST_TITLE, []));
      const same = String(await this.core.mkdir(root3, '📁', 'same', []));
      const other = String(await this.core.mkdir(root3, '📁', 'other', []));
      const inner = String(await this.core.mkdir(other, '📁', 'same', []));
      check(
        'mkdir: the same title is fine in different directories',
        same !== inner && (await db.directory.get(inner as any))?.owner === other
      );

      let rejected = '';
      try {
        await this.core.mkdir(root3, '📁', 'same', []);
      } catch (e: any) {
        rejected = e?.message ?? 'error';
      }
      const twins = await db.directory
        .where('owner')
        .equals(root3)
        .filter((dir) => dir.title === 'same')
        .count();
      check(
        'mkdir: refuses a duplicate title in the same directory',
        rejected !== '' && twins === 1,
        `${twins} dirs titled "same"`
      );

      let rejectedRoot = '';
      try {
        await this.core.mkdir('/', '🧪', TEST_TITLE, []);
      } catch (e: any) {
        rejectedRoot = e?.message ?? 'error';
      }
      check('mkdir: refuses a duplicate title in root too', rejectedRoot !== '');

      const badTitles: string[] = [];
      for (const title of ['..', '.', '', 'a/b']) {
        try {
          await this.core.mkdir(root3, '📁', title, []);
          badTitles.push(JSON.stringify(title));
        } catch {
          /** expected */
        }
      }
      check(
        'mkdir: refuses titles that can not be used in a path',
        badTitles.length === 0,
        `accepted: ${badTitles.join()}`
      );

      /**
       * ID COLLISIONS: force makeId to return ids that are already taken
       * for the first attempts, the real ones are the 3rd one
       */
      await this.core.touch(['first', 'card'], same);
      const firstCard = (await db.card.where('owner').equals(same).toArray())[0];
      const real = this.math.makeId.bind(this.math);
      let attempts = 0;
      (this.math as any).makeId = (length: number) =>
        ++attempts <= 2 ? root3 : real(length);
      let collidedDir = '';
      try {
        collidedDir = String(await this.core.mkdir(root3, '📁', 'collide', []));
      } finally {
        delete (this.math as any).makeId;
      }
      check(
        'ids: mkdir retries when the id is taken',
        collidedDir !== '' &&
          collidedDir !== root3 &&
          attempts === 3 &&
          (await db.directory.get(root3 as any))?.title === TEST_TITLE,
        `attempts: ${attempts}, id: ${collidedDir}`
      );

      attempts = 0;
      (this.math as any).makeId = (length: number) =>
        ++attempts <= 2 ? firstCard.id : real(length);
      try {
        await this.core.touch(['second', 'card'], same);
      } finally {
        delete (this.math as any).makeId;
      }
      const cardsInSame = await db.card.where('owner').equals(same).toArray();
      check(
        'ids: touch retries when the id is taken',
        cardsInSame.length === 2 &&
          attempts === 3 &&
          cardsInSame.some((card) => card.id === firstCard.id && card.contents[0] === 'first'),
        `attempts: ${attempts}, cards: ${cardsInSame.length}`
      );
    } catch (e: any) {
      check('unexpected error', false, e?.message ?? String(e));
    } finally {
      /**
       * CLEANUP: always, even when something above has failed
       */
      await this.purge([root, a, b, deep, root2, stray, root3, root4].filter((id) => id !== ''));
      await db.card.bulkDelete(strayCards as any);
      /** the terminal scenario moved around: put the user back where they were */
      this.terminal.setPath(userPath);
      await this.terminal.revalidate();
      const lostFoundId = await this.doctor.findLostFound();
      if (lostFoundIsOurs && lostFoundId !== null) {
        const inside =
          (await db.directory.where('owner').equals(lostFoundId).count()) +
          (await db.card.where('owner').equals(lostFoundId).count());
        if (inside === 0) await db.directory.delete(lostFoundId as any);
      }
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
