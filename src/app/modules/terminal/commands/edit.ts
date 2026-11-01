import { parseDirectoryEdits, parseEdits } from '../services/edits';
import { sidesWarning } from '../services/move';
import { parseSides } from '../services/sides';
import { CommandContext, TerminalCommand } from './command';

export const mkdir: TerminalCommand = {
  name: 'mkdir',
  group: 'edit',
  usage: 'mkdir <title> [sides...]',
  description: 'create a directory',
  why:
    'A directory is a deck: it holds cards and other directories. The sides you name here ' +
    'are the sides every card in it has, for example Original and Translation. A directory ' +
    'that only holds other directories needs no sides.',
  examples: [
    'mkdir French Original Translation  # two sides',
    'mkdir `My French` Original Translation  # backticks for a title with spaces',
    'mkdir Words Original Transcription Translation  # three sides',
    'mkdir Languages  # no sides: a place for other directories',
  ],
  notes: [
    'The directory is created in the current one (see pwd); use cd to choose where',
    'A title must be unique within its directory and can not contain /',
    'It has no icon; give one with edit <title> icon:🌎',
  ],
  async run(args, ctx) {
    const [title, ...sides] = args;
    if (!title) throw new Error('Usage: mkdir <title> [sides...]');
    await ctx.core.mkdir(ctx.terminal.getCDI(), '', title, sides);
  },
};

export const touch: TerminalCommand = {
  name: 'touch',
  group: 'edit',
  usage: 'touch <sides...>',
  description: 'create a card',
  why:
    'A card is one thing to learn. Its sides are the values, for example a word and ' +
    'its translation. touch puts a new card in the current directory.',
  examples: [
    'touch chat cat  # two sides',
    'touch `Un chat` `A cat`  # backticks for sides with spaces',
    'touch ?`Un chat` `A cat`  # ? before a side: it is only shown, never typed in',
    'touch ??why because  # ?? is one ordinary ?, the side is ?why',
    'touch say "hi"  # a double quote is an ordinary character',
    'touch bonjour /bɔ̃ʒuʁ/ hello  # three sides, for a directory with three',
  ],
  notes: [
    'Give as many sides as the directory has (ls shows them in [brackets])',
    'Not allowed in the root (/): cd into a directory first',
    'A ? before a side makes it question only: study shows it as the question and never asks you to type it, so use it for pictures, sounds, long texts or a text with a gap to fill',
    'A card needs at least one side without ?, that one is the answer',
    'A side that is just ? is an ordinary side; to start a side with ? write ??',
  ],
  async run(args, ctx) {
    if (args.length === 0) throw new Error('Usage: touch <sides...>');
    const owner = ctx.terminal.getCDI();
    if (owner === '/')
      throw new Error('Cards can not be created in root (/): cd into a directory first');
    const { sides, questionOnly } = parseSides(args);
    await ctx.core.touch(sides, owner, questionOnly);
  },
};

export const edit: TerminalCommand = {
  name: 'edit',
  group: 'edit',
  usage: 'edit <id or title> <N:value | icon:X | name:X ...>',
  description: 'change a card, or the sides, icon and name of a directory',
  why:
    'Fixes a card or a directory without removing it and typing it again. A side is named by its ' +
    'place, counted from 1: 1 is the first side, 2 the second, and so on. The id of a card changes ' +
    'its values; the id of a directory changes the names of its sides and can add or take out a side ' +
    'in the directory and in all its cards at once.',
  examples: [
    'edit Lzad 1:chien  # card: the first side becomes chien',
    'edit Lzad 2:`A dog`  # backticks for a value with spaces',
    'edit Lzad 1:chien 2:dog  # several sides at once',
    'edit Lzad 3:  # nothing after the colon: the side becomes empty',
    'edit Lzad 2:10:30  # only the first colon counts, the value is 10:30',
    'edit aB3x 1:Name 2:Phone  # directory: rename its sides, the cards do not change',
    'edit aB3x 3:Email  # directory: add a third side, every card gets an empty one',
    'edit aB3x 3:empty  # take side 3 out, only if no card has a value in it',
    'edit aB3x 3:drop  # take side 3 out with its values in all cards (asks to confirm)',
    'edit French icon:🇨🇵  # directory by its title: give it an icon',
    'edit French icon:  # nothing after the colon: no icon',
    'edit French name:`My French`  # rename the directory itself, the id stays',
    'edit French name:Francais icon:🇫🇷 1:Mot  # all together, in one step',
  ],
  notes: [
    'A directory is named by its title or its id, a card by its id; ls shows them (ls c for cards, ls d for directories); Tab completes them',
    'Numbers are the sides (of a card: its values; of a directory: their names); icon: and name: are the directory itself and are not for cards',
    'Directory: icon: sets the icon, nothing after the colon takes it away; name: sets the title, which must be unique in its directory and can not contain /',
    'Card: only the sides you name change; the id, the schedule and the question only marks stay',
    'Card: it has as many sides as its directory, edit does not add or remove them (edit the directory)',
    'Card: a side that is question only (touch ?) can be changed too',
    'Directory: a name at a place that exists renames the side, the cards go by place and are not touched',
    'Directory: a name at the place right after the last side adds it; places can not be skipped',
    'Directory: N:empty takes the side out only if no card has a value in it; otherwise it keeps the side and says how many cards have one',
    'Directory: N:drop takes the side out and erases its values in every card; you have to type drop to confirm',
    'Directory: the first two sides can not be removed: a card has at least two',
    'Directory: when sides are taken out the later ones move up, with their values and their question only marks',
    'Everything is checked first: if one change is wrong, nothing is changed; cards and directory are written together',
    'There is no undo: the old values are printed so they can be put back; export first if in doubt',
  ],
  async run(args, ctx) {
    const [what, ...words] = args;
    if (!what || words.length === 0)
      throw new Error('Usage: edit <id or title> <N:value | icon:X | name:X ...> (see ids in ls)');

    /** a directory is named by its title or id; a title in this directory wins, as in cd */
    const here = ctx.terminal.getCDI();
    const titled = (await ctx.core.lsdir(here, 0)).find((dir) => dir.title === what);
    const kind = titled ? 'dir' : await ctx.core.whatIs(what, here);
    if (kind === undefined)
      throw new Error(`There is no card or directory "${what}" here (see ls; a card is named by its id)`);
    const id = titled?.id ?? what;

    if (kind === 'card') {
      const edits = parseEdits(words);
      const { before, after } = await ctx.core.editCard(id, edits);
      const lines = after
        .map((value, index) => ({ value, index }))
        .filter(({ value, index }) => value !== before[index])
        .map(({ value, index }) => `  side ${index + 1}: ${show(before[index])} -> ${show(value)}`);
      ctx.out(
        [
          `Edited card ${id}`,
          ...(lines.length > 0 ? lines : ['  nothing differs: the values were the same']),
        ].join('\n')
      );
      return;
    }

    /** a directory: look first, ask if values are going to be erased, then do it */
    const { sides: edits, meta } = parseDirectoryEdits(words);
    const plan = await ctx.core.planDirectory(id, edits);
    const erasing = plan.removed.filter((side) => side.mode === 'drop');
    if (erasing.length > 0) {
      const lost = erasing.map(
        (side) =>
          `side ${side.position} (${side.name}): ${side.withData} of ${plan.cards} ` +
          `card${plan.cards === 1 ? '' : 's'} ${side.withData === 1 ? 'has' : 'have'} a value`
      );
      const agreed = await ctx.confirm({
        notes: [
          'This takes out the side from the directory and erases it from all its cards, for good:',
          ...lost,
        ],
        word: 'drop',
      });
      if (!agreed) {
        ctx.out('Cancelled: nothing was changed');
        return;
      }
    }

    const before = await ctx.core.dir(id);
    const done = await ctx.core.editDirectory(id, edits, meta);
    const report = [
      ...(meta.name !== undefined && meta.name !== before?.title
        ? [`  name: ${show(before?.title ?? '')} -> ${show(meta.name)}`]
        : []),
      ...(meta.icon !== undefined && meta.icon !== before?.icon
        ? [`  icon: ${show(before?.icon ?? '')} -> ${show(meta.icon)}`]
        : []),
      ...done.renamed.map((side) => `  side ${side.position}: ${show(side.from)} -> ${show(side.to)}`),
      ...done.added.map(
        (side) =>
          `  side ${side.position} added: ${show(side.name)} ` +
          `(${done.cards} card${done.cards === 1 ? '' : 's'} got an empty value)`
      ),
      ...done.removed.map((side) =>
        side.mode === 'empty'
          ? `  ✓ Clear: side ${side.position} (${side.name}) is taken out, no card had a value in it`
          : `  side ${side.position} (${side.name}) is taken out; ` +
            `${side.withData} card${side.withData === 1 ? '' : 's'} lost a value`
      ),
    ];
    ctx.out(
      [
        `Edited directory ${id}: [${done.fields.join(', ')}]`,
        ...(report.length > 0 ? report : ['  nothing differs: the values were the same']),
      ].join('\n')
    );
  },
  async complete(partial, ctx) {
    /** only the first word is an id: after it come N:value words, which have nothing to complete */
    if (/^\d+:/.test(partial)) return [];
    const here = ctx.terminal.getCDI();
    const dirs = await ctx.core.lsdir(here, 0);
    const names = [...(await ctx.core.cardIds(here)), ...dirs.map((dir) => dir.id), ...dirs.map((dir) => dir.title)];
    return names.filter((name) => name.startsWith(partial));
  },
};

/** a value in the report: in backticks, so an empty one and one with spaces are visible */
const show = (value: string) => '`' + value + '`';

export const rm: TerminalCommand = {
  name: 'rm',
  group: 'edit',
  usage: 'rm <id>',
  description: 'remove a card',
  why: 'Gets rid of one card you do not need. Directories are removed with rmdir.',
  examples: ['rm Lzad  # the id is shown by ls c'],
  notes: [
    'Tab completes the id of a card in the current directory',
    'Cards only: give the id of a directory and rm refuses, pointing you to rmdir',
    'There is no confirmation and no undo: export first if in doubt',
  ],
  async run(args, ctx) {
    if (args.length !== 1) throw new Error('Usage: rm <id> (see ids in ls)');
    const id = args[0];
    if ((await ctx.core.removeCard(id)) === 0)
      throw new Error(`There is no card with the id ${id} (directories are removed with rmdir)`);
    ctx.out(`Removed card ${id}`);
  },
  async complete(partial, ctx) {
    const ids = await ctx.core.cardIds(ctx.terminal.getCDI());
    return ids.filter((id) => id.startsWith(partial));
  },
};

export const rmdir: TerminalCommand = {
  name: 'rmdir',
  group: 'edit',
  usage: 'rmdir <title or id>',
  description: 'remove a directory with everything inside',
  why: 'Gets rid of a directory you do not need, together with all its cards and sub-directories.',
  examples: [
    'rmdir French  # by title, in the current directory',
    'rmdir `My French`  # backticks for a title with spaces',
    'rmdir aB3x  # by id, as shown by ls',
  ],
  notes: [
    'A title in the current directory wins; otherwise the argument is taken as an id',
    'Tab completes the titles and ids of directories in the current directory',
    'Removes everything inside too, at any depth, in one go',
    'Says how many inner directories and cards went with it, for example: Removed directory aB3x with 3 inner directories and 46 cards',
    'There is no confirmation and no undo: export first if in doubt',
  ],
  async run(args, ctx) {
    const what = args.at(0);
    if (!what || args.length !== 1) throw new Error('Usage: rmdir <title or id> (see ls)');
    /** a title in this directory wins, as in cd, mv and edit */
    const titled = (await ctx.core.lsdir(ctx.terminal.getCDI(), 0)).find((dir) => dir.title === what);
    const id = titled?.id ?? what;
    const removed = await ctx.core.removeDir(id);
    if (removed.dirs === 0) throw new Error(`There is no directory "${what}" here (see ls)`);
    /** we may have just removed the directory we are standing in */
    await ctx.terminal.revalidate();

    /** the directory itself is not "inner": only what was inside it is counted */
    const inner = removed.dirs - 1;
    ctx.out(
      `Removed directory ${what} with ${inner} inner director${inner === 1 ? 'y' : 'ies'} ` +
        `and ${removed.cards} card${removed.cards === 1 ? '' : 's'}`
    );
  },
  async complete(partial, ctx) {
    const dirs = await ctx.core.lsdir(ctx.terminal.getCDI(), 0);
    return [...dirs.map((dir) => dir.id), ...dirs.map((dir) => dir.title)].filter((name) =>
      name.startsWith(partial)
    );
  },
};

export const mv: TerminalCommand = {
  name: 'mv',
  group: 'edit',
  usage: 'mv <card or directory> <directory>',
  description: 'move a card or a directory into another directory',
  why:
    'Puts a card or a whole directory (with everything inside it) in another place without ' +
    'typing it again. The ids do not change, so nothing that points at them breaks. ' +
    'One thing at a time: the first word is what moves, the second is where to.',
  examples: [
    'mv French Languages  # the directory French goes into Languages',
    'mv aB3x Languages  # the same, by the id that ls shows',
    'mv Lzad French/Verbs  # a card (by id) goes into French/Verbs',
    'mv Lzad kT9p  # the target can be the id of a directory too, wherever it is',
    'mv French /  # a directory goes to the root',
    'mv Verbs ..  # one level up',
  ],
  notes: [
    'What moves: a directory by its title or id, as ls shows them in the current directory; a card by its id',
    'Where to: a path, as in cd (a name, .., /, French/Verbs, /French), or the id of a directory',
    'A card can not go to the root (/): cards live in directories',
    'A directory can not go into itself or into a directory inside it',
    'A directory can not go where there is a directory with the same title',
    'A card is moved even if its sides do not match the sides of the directory, but you get a warning',
    'A directory is moved with its cards and sub-directories; nothing inside it changes',
    'Tab completes names and ids; it does not tell the first word from the second, so it offers both',
  ],
  async run(args, ctx) {
    if (args.length !== 2) throw new Error('Usage: mv <card or directory> <directory> (see ids in ls)');
    const [what, where] = args;
    const here = ctx.terminal.getCDI();

    /** a directory is named by its title or id; a title in this directory wins, as in cd */
    const titled = (await ctx.core.lsdir(here, 0)).find((dir) => dir.title === what);
    const kind = titled ? 'dir' : await ctx.core.whatIs(what, here);
    if (kind === undefined)
      throw new Error(`There is no card or directory "${what}" here (see ls; a card is named by its id)`);
    const id = titled?.id ?? what;

    const to = await targetOf(where, ctx);
    if (kind === 'dir') {
      await ctx.core.moveDir(id, to);
      /** the directory we stand in may have moved, and the path we hold is the old one */
      await ctx.terminal.revalidate();
      ctx.out(`Moved directory ${what} to ${await ctx.core.pathOf(to)}`);
      return;
    }

    const { target, sides } = await ctx.core.moveCard(id, to);
    ctx.out(`Moved card ${id} to ${await ctx.core.pathOf(to)}`);

    const warning = sidesWarning(sides, target.title, target.fields);
    if (warning) ctx.out(warning);
  },
  async complete(partial, ctx) {
    const cut = partial.lastIndexOf('/') + 1;
    const base = partial.slice(0, cut);
    const rest = partial.slice(cut);
    try {
      const dir = base ? await ctx.terminal.resolve(ctx.terminal.getPath(), base) : ctx.terminal.getPath();
      const owner = dir.at(-1)?.id ?? '/';
      const dirs = (await ctx.core.lsdir(owner, 0)).map((item) => item.title);
      /** ids of cards and of directories are only offered for a word that is not a path */
      const ids = base ? [] : [...(await ctx.core.cardIds(owner)), ...(await ctx.core.lsdir(owner, 0)).map((item) => item.id)];
      return [...dirs, ...ids].filter((name) => name.startsWith(rest)).map((name) => base + name);
    } catch {
      return [];
    }
  },
};

/**
 * Where a directory or a card is going: a path as in cd, or the id of a directory anywhere
 * @returns the id of the directory, '/' for the root
 */
async function targetOf(where: string, ctx: CommandContext): Promise<string> {
  try {
    const path = await ctx.terminal.resolve(ctx.terminal.getPath(), where);
    return path.at(-1)?.id ?? '/';
  } catch (error) {
    if (!where.includes('/') && (await ctx.core.dir(where)) !== undefined) return where;
    throw error;
  }
}
