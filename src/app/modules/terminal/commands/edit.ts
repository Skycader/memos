import { parseEdits } from '../services/edits';
import { parseSides } from '../services/sides';
import { TerminalCommand } from './command';

export const mkdir: TerminalCommand = {
  name: 'mkdir',
  group: 'edit',
  usage: 'mkdir <icon> <title> <sides...>',
  description: 'create a directory',
  why:
    'A directory is a deck: it holds cards and other directories. The sides you name here ' +
    'are the sides every card in it has, for example Original and Translation.',
  examples: [
    'mkdir 🇫🇷 French Original Translation  # two sides',
    'mkdir 🇫🇷 `My French` Original Translation  # backticks for a title with spaces',
    'mkdir 🎓 Words Original Transcription Translation  # three sides',
  ],
  notes: [
    'The directory is created in the current one (see pwd); use cd to choose where',
    'A title must be unique within its directory and can not contain /',
  ],
  async run(args, ctx) {
    const [icon, title, ...sides] = args;
    if (!icon || !title) throw new Error('Usage: mkdir <icon> <title> <sides...>');
    await ctx.core.mkdir(ctx.terminal.getCDI(), icon, title, sides);
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
  usage: 'edit <id> <N:value...>',
  description: 'change sides of a card or of a directory',
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
  ],
  notes: [
    'The id is shown by ls (ls c for cards, ls d for directories); Tab completes it',
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
    const [id, ...words] = args;
    if (!id || words.length === 0)
      throw new Error('Usage: edit <id> <N:value...> (see ids in ls)');

    const kind = await ctx.core.whatIs(id, ctx.terminal.getCDI());
    if (kind === undefined) throw new Error(`There is no card or directory with the id ${id}`);
    const edits = parseEdits(words);

    if (kind === 'card') {
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
    const plan = await ctx.core.planDirectory(id, edits);
    const erasing = plan.removed.filter((side) => side.mode === 'drop');
    if (erasing.length > 0) {
      const lost = erasing
        .map(
          (side) =>
            `side ${side.position} (${side.name}): ${side.withData} of ${plan.cards} ` +
            `card${plan.cards === 1 ? '' : 's'} ${side.withData === 1 ? 'has' : 'have'} a value`
        )
        .join('\n  ');
      const answer = await ctx.ask(
        `This takes out the side from the directory and erases it from all its cards, for good:\n  ${lost}\n` +
          'Type drop to confirm:'
      );
      if (answer.trim() !== 'drop') {
        ctx.out('Cancelled: nothing was changed');
        return;
      }
    }

    const done = await ctx.core.editDirectory(id, edits);
    const report = [
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
        ...(report.length > 0 ? report : ['  nothing differs: the names were the same']),
      ].join('\n')
    );
  },
  async complete(partial, ctx) {
    /** only the first word is an id: after it come N:value words, which have nothing to complete */
    if (/^\d+:/.test(partial)) return [];
    const here = ctx.terminal.getCDI();
    const ids = [
      ...(await ctx.core.cardIds(here)),
      ...(await ctx.core.lsdir(here, 0)).map((dir) => dir.id),
    ];
    return ids.filter((id) => id.startsWith(partial));
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
  usage: 'rmdir <id>',
  description: 'remove a directory with everything inside',
  why: 'Gets rid of a directory you do not need, together with all its cards and sub-directories.',
  examples: ['rmdir aB3x  # the id is shown by ls'],
  notes: [
    'Tab completes the id of a directory in the current directory',
    'Removes everything inside too, at any depth, in one go',
    'Says how many inner directories and cards went with it, for example: Removed directory aB3x with 3 inner directories and 46 cards',
    'There is no confirmation and no undo: export first if in doubt',
  ],
  async run(args, ctx) {
    const id = args.at(0);
    if (!id) throw new Error('Usage: rmdir <id> (see ids in ls)');
    const removed = await ctx.core.removeDir(id);
    if (removed.dirs === 0) throw new Error('Directory does not exist');
    /** we may have just removed the directory we are standing in */
    await ctx.terminal.revalidate();

    /** the directory itself is not "inner": only what was inside it is counted */
    const inner = removed.dirs - 1;
    ctx.out(
      `Removed directory ${id} with ${inner} inner director${inner === 1 ? 'y' : 'ies'} ` +
        `and ${removed.cards} card${removed.cards === 1 ? '' : 's'}`
    );
  },
  async complete(partial, ctx) {
    const dirs = await ctx.core.lsdir(ctx.terminal.getCDI(), 0);
    return dirs.map((dir) => dir.id).filter((id) => id.startsWith(partial));
  },
};
