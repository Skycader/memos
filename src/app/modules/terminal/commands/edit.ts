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
    'touch say "hi"  # a double quote is an ordinary character',
    'touch bonjour /bɔ̃ʒuʁ/ hello  # three sides, for a directory with three',
  ],
  notes: [
    'Give as many sides as the directory has (ls shows them in [brackets])',
    'Not allowed in the root (/): cd into a directory first',
  ],
  async run(args, ctx) {
    if (args.length === 0) throw new Error('Usage: touch <sides...>');
    const owner = ctx.terminal.getCDI();
    if (owner === '/')
      throw new Error('Cards can not be created in root (/): cd into a directory first');
    await ctx.core.touch(args, owner);
  },
};

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
