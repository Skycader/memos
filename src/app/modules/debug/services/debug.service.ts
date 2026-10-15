import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { AppDB, db, wipe } from '../../database/services/db';
import { MathService } from '../../math/services/math.service';
import { FontService } from '../../core/services/font.service';
import { parseCsv, toCsv } from '../../exchange/csv';
import { ExchangeService } from '../../exchange/exchange.service';
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
    private exchange: ExchangeService,
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
        ['touch `Un chat` `A cat`', ['touch', 'Un chat', 'A cat']],
        ["touch l'ami friend", ['touch', "l'ami", 'friend']],
        ["touch 'l'ami' friend", ['touch', "l'ami", 'friend']],
        ['touch `say \\`hi\\``', ['touch', 'say `hi`']],
        ['touch say "hi"', ['touch', 'say', '"hi"']],
        ['touch `say "hi" now` x', ['touch', 'say "hi" now', 'x']],
        ['touch `` x', ['touch', '', 'x']],
        ['touch a\\ b', ['touch', 'a b']],
        ['  ls   ', ['ls']],
        ['', []],
        ['touch `Un chat', 'error'],
      ];
      const badCases = cases.filter(([line, expected]) => {
        try {
          return JSON.stringify(tokenize(line)) !== JSON.stringify(expected);
        } catch {
          return expected !== 'error';
        }
      });
      check(
        'tokenizer: backticks, apostrophes, double quotes as plain text, escapes and empty words',
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
        'registry: every command has usage, description, why and examples',
        COMMANDS.every(
          (command) =>
            command.usage.startsWith(command.name) &&
            command.description &&
            command.why &&
            command.examples.length > 0
        )
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
       * DROP: erasing a database must leave it empty and still usable, with no reload.
       * Done on a scratch database: `test` must never touch the real data
       */
      const scratch = new AppDB('memos-scratch-drop');
      try {
        const sample = { id: 'SCR1', owner: '/', icon: 'x', title: 'before', fields: [] };
        await scratch.directory.add(sample);
        await wipe(scratch);
        const emptied = (await scratch.directory.count()) === 0;
        await scratch.directory.add({ ...sample, title: 'after' });
        check(
          'drop: the database is empty afterwards and still usable (no reload needed)',
          emptied && scratch.isOpen() && (await scratch.directory.count()) === 1,
          `empty: ${emptied}, open: ${scratch.isOpen()}`
        );
      } catch (e: any) {
        check('drop: the database is empty afterwards and still usable (no reload needed)', false, e?.message);
      } finally {
        await scratch.delete();
      }

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
        await run('mkdir 📁 `Sub Dir` Q A');

        /** ls: directories and cards together, or only one kind */
        await run('touch top side');
        const lsAll = (await run('ls')).out;
        const lsDirs = (await run('ls d')).out;
        const lsCards = (await run('ls c')).out;
        const hasDir = (text: string) => text.includes('DIR ') && text.includes('Sub Dir');
        const hasCard = (text: string) => text.includes('CARD ') && text.includes('[top,side]');
        check('ls: shows directories and cards', hasDir(lsAll) && hasCard(lsAll), lsAll);
        check(
          'ls d and ls -d: only directories',
          hasDir(lsDirs) && !hasCard(lsDirs) && (await run('ls -d')).out === lsDirs,
          lsDirs
        );
        check(
          'ls c and ls -c: only cards',
          hasCard(lsCards) && !hasDir(lsCards) && (await run('ls -c')).out === lsCards,
          lsCards
        );
        check(
          'ls: both letters mean both kinds, anything else is an error',
          (await run('ls dc')).out === lsAll &&
            (await run('ls -dc')).out === lsAll &&
            (await run('ls x')).err.includes('Usage: ls') &&
            (await run('ls -')).err.includes('Usage: ls')
        );
        check(
          'lsd, lsdir and dir are gone: ls d replaces them',
          (await run('lsd')).err.includes('not found') &&
            (await run('lsdir')).err.includes('not found') &&
            (await run('dir')).err.includes('not found')
        );

        /**
         * ls pages: 3 directories and 45 cards are 48 items, so 3 pages of 20, 20 and 8
         */
        await run('mkdir 📄 Pages Q A');
        const pagesId = (await this.core.lsdir(root4, 0)).find((dir) => dir.title === 'Pages')?.id ?? '';
        for (const name of ['d1', 'd2', 'd3']) await this.core.mkdir(pagesId, '📁', name, []);
        for (let i = 1; i <= 45; i++) await this.core.touch([`q${i}`, `a${i}`], pagesId);
        await run('cd Pages');

        const count = (text: string, word: string) => (text.match(new RegExp(`${word} `, 'g')) ?? []).length;
        const idsOf = (text: string) => [...text.matchAll(/CARD (\w+) /g)].map((match) => match[1]);
        const page1 = (await run('ls')).out;
        const page2 = (await run('ls 2')).out;
        const page3 = (await run('ls 3')).out;
        check(
          'ls: the first page has the directories, then cards, and says "page 1 of 3"',
          count(page1, 'DIR') === 3 &&
            count(page1, 'CARD') === 17 &&
            page1.includes('page 1 of 3') &&
            page1.includes('ls 2 for the next page'),
          page1.split('\n').slice(-2).join(' | ')
        );
        check(
          'ls 2 and ls 3: the next pages, the last one without a next-page hint',
          count(page2, 'CARD') === 20 &&
            page2.includes('page 2 of 3') &&
            count(page3, 'CARD') === 8 &&
            page3.includes('page 3 of 3') &&
            !page3.includes('for the next page')
        );
        const allIds = [...idsOf(page1), ...idsOf(page2), ...idsOf(page3)];
        check(
          'ls: the pages together hold every card exactly once',
          allIds.length === 45 && new Set(allIds).size === 45,
          `${allIds.length} cards, ${new Set(allIds).size} different`
        );
        const cardPage = (await run('ls c')).out;
        check(
          'ls c: pages count only cards, and the hint keeps the filter',
          count(cardPage, 'DIR') === 0 &&
            count(cardPage, 'CARD') === 20 &&
            cardPage.includes('page 1 of 3') &&
            cardPage.includes('ls c 2 for the next page') &&
            (await run('ls 3 c')).out.includes('page 3 of 3') &&
            (await run('ls d')).out.includes('page') === false
        );
        const farPage = await run('ls 4');
        check(
          'ls: a page that does not exist, page 0 and two page numbers are errors',
          farPage.err.includes('no page 4') &&
            (await run('ls 0')).err.includes('counted from 1') &&
            (await run('ls 1 2')).err.includes('Usage: ls'),
          farPage.err
        );
        check(
          'ls: a short directory has no page line',
          !lsAll.includes('page ') && !lsAll.includes('of ')
        );

        /** put the scene back: the rest of the scenario expects /__test__ with one directory */
        await run(`cd /${TEST_TITLE}`);
        await this.core.removeDir(pagesId);

        /**
         * rm removes one card by id. Along the way: a double quote is plain text in a side
         */
        await run('touch gone "bye"');
        const gone = (await db.card.where('owner').equals(root4).toArray()).find(
          (card) => card.contents[0] === 'gone'
        );
        check(
          'touch: a double quote inside a side stays as typed',
          gone?.contents.join('|') === 'gone|"bye"',
          JSON.stringify(gone?.contents)
        );
        const cardsBefore = await db.card.where('owner').equals(root4).count();
        const removedCard = await run(`rm ${gone?.id}`);
        check(
          'rm: removes exactly one card by id',
          removedCard.err === '' &&
            removedCard.out.includes('Removed card') &&
            (await db.card.get((gone as any).id)) === undefined &&
            (await db.card.where('owner').equals(root4).count()) === cardsBefore - 1,
          removedCard.out + removedCard.err
        );
        check(
          'rm: the same id again, a directory id, no argument and two arguments are errors',
          (await run(`rm ${gone?.id}`)).err.includes('no card') &&
            (await run(`rm ${root4}`)).err.includes('rmdir') &&
            (await run('rm')).err.includes('Usage: rm') &&
            (await run('rm a b')).err.includes('Usage: rm') &&
            (await db.directory.get(root4 as any)) !== undefined
        );

        /**
         * seed: the demo data goes into the current directory (/__test__)
         */
        const seeded = await run('seed');
        check(
          'seed: creates "Demo" with 3 decks and 46 cards',
          seeded.err === '' && seeded.out.includes('4 directories and 46 cards'),
          seeded.out + seeded.err
        );
        await run('cd Demo');
        const decks = (await run('ls d')).out;
        check(
          'seed: Demo holds French (3 sides), Capitals and Math',
          decks.includes('[Original,Transcription,Translation]') &&
            decks.includes('Capitals') &&
            decks.includes('Math')
        );
        await run('cd French');
        const french1 = (await run('ls')).out;
        const french2 = (await run('ls 2')).out;
        check(
          'seed: French has 26 cards, 2 pages of ls',
          french1.includes('page 1 of 2') &&
            count(french1, 'CARD') === 20 &&
            count(french2, 'CARD') === 6 &&
            Number(french1.includes('[le chat,/lə ʃa/,cat]')) +
              Number(french2.includes('[le chat,/lə ʃa/,cat]')) ===
              1
        );
        await run(`cd /${TEST_TITLE}`);
        const secondSeed = await run('seed');
        check(
          'seed: refuses to run twice in the same directory, and says how to remove it',
          secondSeed.err.includes('already exists') && secondSeed.err.includes('rmdir'),
          secondSeed.err
        );
        const demoId = (await this.core.lsdir(root4, 0)).find((dir) => dir.title === 'Demo')?.id ?? '';
        await this.core.removeDir(demoId);
        check(
          'seed: Demo is removed as a whole by rmdir (no cards left behind)',
          (await db.card.where('owner').equals(demoId).count()) === 0 &&
            (await this.core.lsdir(root4, 0)).every((dir) => dir.title !== 'Demo')
        );
        /** Tab completion, with the directories created above next to us */
        const tab = async (typed: string) => (await shell.complete(typed)).buffer;
        const tabOptions = async (typed: string) => (await shell.complete(typed)).options;
        check(
          'tab: completes a command name',
          (await tab('fo')) === 'font ' && (await tab('th')) === 'theme ',
          `${await tab('fo')} | ${await tab('th')}`
        );
        check('tab: help completes the name of a command', (await tab('help to')) === 'help touch');

        /** ids: we are in /__test__, with one card and one directory in it */
        const topId = (await db.card.where('owner').equals(root4).toArray())[0]?.id ?? '';
        const subId = (await this.core.lsdir(root4, 0))[0]?.id ?? '';
        check(
          'tab: a name typed in full gets its space, longer names do not hide it (rm, rmdir)',
          (await tab('rm')) === 'rm ' && (await tab('rmd')) === 'rmdir ' && (await tab('cd')) === 'cd ',
          `${await tab('rm')} | ${await tab('rmd')} | ${await tab('cd')}`
        );
        check(
          'tab: rm completes the id of a card here, rmdir the id of a directory here',
          topId !== '' &&
            subId !== '' &&
            (await tab('rm ')) === `rm ${topId}` &&
            (await tab(`rm ${topId.slice(0, 2)}`)) === `rm ${topId}` &&
            (await tab(`rmdir ${subId.slice(0, 2)}`)) === `rmdir ${subId}` &&
            (await tab('rm !!')) === 'rm !!',
          `card ${topId}: ${await tab('rm ')}, dir ${subId}: ${await tab(`rmdir ${subId.slice(0, 2)}`)}`
        );
        check(
          'tab: lists the options when a name is ambiguous',
          (await tabOptions('d')).sort().join() === 'doctor,drop',
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
          (await tab('cd Sub')) === 'cd `Sub Dir`' && (await tab(`cd /${TEST_TITLE.slice(0, 4)}`)) === `cd /${TEST_TITLE}`,
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

        await run('cd `Sub Dir`');
        const where = (await run('pwd')).out;
        check('terminal: cd into a name with spaces (backticks)', where === `/${TEST_TITLE}/Sub Dir`, where);

        await run('touch `Un chat` `A cat`');
        const listed = (await run('ls')).out;
        check(
          'terminal: touch keeps quoted sides with spaces as single sides',
          listed.includes('[Un chat,A cat]'),
          listed
        );

        await run('cd ../..');
        check('terminal: cd ../.. goes up two levels', (await run('pwd')).out === '/');
        await run(`cd \`/${TEST_TITLE}/Sub Dir\``);
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
        check('terminal: unclosed quote is an error', (await run('touch `a')).err.includes('quote'));

        await run('cd /');
        const rootTouch = await run('touch x y');
        check(
          'terminal: touch in root says why it refused',
          rootTouch.err.includes('root'),
          rootTouch.err
        );

        const helpText = (await run('help')).out;
        const missingLine = (command: (typeof COMMANDS)[number]) =>
          !helpText.includes(
            `    · ${command.name} - ${command.description} (type help ${command.name} for more)`
          );
        check(
          'help: one short line per command from the registry, grouped, no examples',
          COMMANDS.every((command) => !missingLine(command)) &&
            ['Navigation', 'Data manipulation', 'Import and export', 'System', 'Testing and diagnostics'].every(
              (title) => helpText.split('\n').includes(` * ${title}`)
            ) &&
            !helpText.includes('Examples'),
          COMMANDS.filter(missingLine).map((command) => command.name).join()
        );

        const touchHelp = (await run('help touch')).out;
        check(
          'help touch: what it is for, examples and rules',
          touchHelp.trim().startsWith('touch <sides...>') &&
            touchHelp.includes('Why') &&
            touchHelp.includes('Examples') &&
            touchHelp.includes('touch `Un chat` `A cat`') &&
            touchHelp.includes('Notes'),
          touchHelp
        );
        const poor: string[] = [];
        for (const command of COMMANDS) {
          const text = (await run(`help ${command.name}`)).out;
          if (!text.includes(command.usage) || !text.includes('Why') || !text.includes('Examples'))
            poor.push(command.name);
        }
        check('help <command> works for every command in the registry', poor.length === 0, poor.join());
        const stuck = (text: string) =>
          text.split('\n').filter((line) => line !== '' && !line.startsWith(' '));
        check(
          'help: nothing sticks to the left edge: " * Title", then items as "    · item"',
          stuck(helpText).length === 0 &&
            stuck(touchHelp).length === 0 &&
            helpText.includes('\n * Data manipulation\n\n') &&
            helpText.includes('\n    · touch - create a card'),
          [...stuck(helpText), ...stuck(touchHelp)].join(' | ')
        );
        check(
          'help: an unknown command or too many words are errors',
          (await run('help nosuch')).err.includes('No such command') &&
            (await run('help a b')).err.includes('Usage: help')
        );
        check(
          'help: ends with the Planned list and exactly one empty line before the next prompt',
          helpText.endsWith(
            ' * Planned (not implemented yet)\n\n' +
              '    · touch ?`Un chat` `A cat` - make a side question only\n' +
              '    · rmdir <dir name> - remove a directory by name\n\n'
          ) &&
            !helpText.endsWith('\n\n\n') &&
            touchHelp.endsWith('\n\n') &&
            !touchHelp.endsWith('\n\n\n'),
          JSON.stringify(helpText.slice(-160))
        );

        /**
         * The screen: selected text must stay selected, or it can not be copied
         */
        const screen = document.querySelector('.terminal') as HTMLElement | null;
        const box = screen?.querySelector('input') as HTMLInputElement | null;
        const written = Array.from(screen?.querySelectorAll('pre.line') ?? []).find(
          (line) => (line.textContent ?? '').trim() !== ''
        );
        if (screen && box && written) {
          const selection = window.getSelection() as Selection;
          const click = () => screen.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          const press = (init: KeyboardEventInit) =>
            document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));

          /** a mouse selection takes the focus out of the input, and while an input has the
           * focus the browser does not report a selection made elsewhere */
          box.blur();
          selection.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(written);
          selection.addRange(range);
          /** a page that is not drawn (a hidden or minimised window) reports no selection at all,
           * so there is nothing to check: say so instead of failing */
          const reportable = selection.toString() !== '';
          click();
          const kept = !reportable || selection.toString() !== '';

          selection.removeAllRanges();
          box.blur();
          click();
          const refocused = document.activeElement === box;

          box.blur();
          press({ key: 'a' });
          const typingGoesToInput = document.activeElement === box;

          box.blur();
          press({ key: 'c', ctrlKey: true });
          const shortcutUntouched = document.activeElement !== box;

          selection.removeAllRanges();
          box.focus();
          check(
            'screen: a click keeps a selection; with none it focuses the input; typing returns to the input, Ctrl+C is left alone',
            kept && refocused && typingGoesToInput && shortcutUntouched,
            `kept: ${kept}, click focuses: ${refocused}, typing: ${typingGoesToInput}, ctrl+c untouched: ${shortcutUntouched}`
          );
          if (!reportable)
            lines.push(
              '  (the selection part of the check above was skipped: the page is not drawn, so the browser reports no selection)'
            );
        }

        /** remove the tree while standing inside it: the session has to step out */
        await run(`cd \`/${TEST_TITLE}/Sub Dir\``);
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
       * CSV: the pure part of export and import
       */
      const sample = [['a,b', 'say "hi"', 'two\nlines', '😀', '', ' padded '], ['x'], ['', '']];
      check(
        'csv: commas, quotes, line breaks, emoji and empty cells survive a round trip',
        JSON.stringify(parseCsv(toCsv(sample))) === JSON.stringify(sample),
        JSON.stringify(parseCsv(toCsv(sample)))
      );
      check(
        'csv: Windows line breaks, a missing final line break and blank lines are fine',
        JSON.stringify(parseCsv('a,b\r\n\r\nc,d')) === JSON.stringify([['a', 'b'], ['c', 'd']])
      );
      let unclosed = false;
      try {
        parseCsv('a,"b');
      } catch {
        unclosed = true;
      }
      check('csv: an unclosed quote is an error', unclosed);

      /**
       * EXPORT AND IMPORT: a tree with awkward names and progress goes out, is deleted,
       * comes back from the file, and must be the same. The real database is exported
       * as a whole, so only the test's own rows are cut out of the file for the import.
       */
      const mine = (text: string) =>
        parseCsv(text).filter(
          (row) =>
            row[0] !== 'memos' && (row[1] === TEST_TITLE || row[1].startsWith(TEST_TITLE + '/'))
        );
      const canon = (rows: string[][]) => rows.map((row) => JSON.stringify(row)).sort().join('\n');

      const root5 = String(await this.core.mkdir('/', '🧪', TEST_TITLE, ['Front', 'Back']));
      const verbs = String(
        await this.core.mkdir(root5, '📁', 'Verbs, "irregular"', ['Q', 'A', 'Tip'])
      );
      const verbsDeep = String(await this.core.mkdir(verbs, '📂', 'deep', ['Q', 'A']));
      await this.core.touch(['Un chat, "le" chat', 'A cat\nwith a line break'], root5);
      await this.core.touch(['être', 'to be', 'irregular'], verbs);
      await this.core.touch(['aller', 'to go', ''], verbs);
      await this.core.touch(['q', 'a'], verbsDeep);
      await this.core.touch(['q2', 'a2'], verbsDeep);
      const etre = (await db.card.where('owner').equals(verbs).toArray()).find(
        (card) => card.contents[0] === 'être'
      );
      await db.card.update((etre as any).id, {
        next: 1900000000000,
        prev: 1800000000000,
        spec: { status: [[1], [0], []], qfields: [2], maxInterval: 30 },
      });

      const exported = await this.exchange.exportCsv();
      const before = mine(exported.text);
      check(
        'export: the file has the directories, the cards and the progress',
        before.filter((row) => row[0] === 'dir').length === 3 &&
          before.filter((row) => row[0] === 'card').length === 5 &&
          before.some(
            (row) =>
              row[0] === 'card' &&
              row[2] === '1900000000000' &&
              row[3] === '1800000000000' &&
              row[4].includes('"qfields":[2]')
          ),
        `${before.length} rows`
      );
      check(
        'export: starts with the format row, no BOM',
        exported.text.startsWith(`memos,1,${db.name},`) && !exported.text.startsWith('﻿')
      );
      check(
        'export: the file is named <database>-<date>.csv',
        this.exchange.fileName(new Date(2026, 9, 14)) === `${db.name}-2026-10-14.csv`,
        this.exchange.fileName(new Date(2026, 9, 14))
      );

      const only = toCsv([parseCsv(exported.text)[0], ...before]);
      await this.core.removeDir(root5);
      check('import: setup, the tree is gone before the import', (await this.findTestRoots()).length === 0);

      const dry = await this.exchange.importCsv(only, true);
      check(
        'import --dry-run: reports what would happen and writes nothing',
        dry.dirsCreated === 3 &&
          dry.cardsAdded === 5 &&
          (await this.findTestRoots()).length === 0,
        JSON.stringify(dry)
      );

      const imported = await this.exchange.importCsv(only);
      check(
        'import: creates the directories and the cards',
        imported.dirsCreated === 3 &&
          imported.cardsAdded === 5 &&
          imported.cardsSkipped === 0 &&
          imported.warnings.length === 0,
        JSON.stringify(imported)
      );
      check(
        'import: what comes back equals what went out (names, sides, icons, progress)',
        canon(mine((await this.exchange.exportCsv()).text)) === canon(before)
      );

      const again = await this.exchange.importCsv(only);
      check(
        'import: a second import adds nothing (merge, same cards are skipped)',
        again.dirsCreated === 0 &&
          again.dirsMerged === 3 &&
          again.cardsAdded === 0 &&
          again.cardsSkipped === 5,
        JSON.stringify(again)
      );

      const bad: string[] = [];
      for (const text of ['hello,world\n', 'memos,2\n', 'memos,1\nfoo,bar\n', 'memos,1\ndir,../x,I\n', 'memos,1\ncard,a,1,2\n']) {
        try {
          await this.exchange.importCsv(text);
          bad.push(JSON.stringify(text));
        } catch {
          /** expected */
        }
      }
      check('import: refuses files that are not a Memos CSV', bad.length === 0, `accepted: ${bad.join()}`);

      /** the imported copy must go before the next scenario uses the same title */
      await this.purge(await this.findTestRoots());

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
      /** whatever else sits under the reserved title, for example an imported copy after a failure */
      await this.purge(await this.findTestRoots());
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
