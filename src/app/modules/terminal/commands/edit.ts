import { TerminalCommand } from './command';

export const mkdir: TerminalCommand = {
  name: 'mkdir',
  group: 'edit',
  usage: 'mkdir <icon> <title> <sides...>',
  description: 'create a directory in the current one',
  notes: [
    'A title must be unique within its directory and can not contain /',
    'Example: mkdir 🇫🇷 French Original Translation',
    'Example: mkdir 🇫🇷 "My French" Original Translation',
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
  description: 'create a card in the current directory',
  notes: [
    'Example: touch chat cat',
    'Example: touch "Un chat" "A cat" (quotes for sides with spaces)',
    'Not allowed in root (/): create cards inside a directory',
  ],
  async run(args, ctx) {
    if (args.length === 0) throw new Error('Usage: touch <sides...>');
    const owner = ctx.terminal.getCDI();
    if (owner === '/')
      throw new Error('Cards can not be created in root (/): cd into a directory first');
    await ctx.core.touch(args, owner);
  },
};

export const rmdir: TerminalCommand = {
  name: 'rmdir',
  group: 'edit',
  usage: 'rmdir <id>',
  description: 'remove a directory by id (see ids in ls)',
  notes: [
    'Example: rmdir aB3x',
    'Removes everything inside too: subdirectories and cards, at any depth',
  ],
  async run(args, ctx) {
    const id = args.at(0);
    if (!id) throw new Error('Usage: rmdir <id> (see ids in ls)');
    const removed = await ctx.core.removeDir(id);
    if (removed === 0) throw new Error('Directory does not exist');
    /** we may have just removed the directory we are standing in */
    await ctx.terminal.revalidate();
    ctx.out(`Removed ${removed} director${removed === 1 ? 'y' : 'ies'} with all cards`);
  },
};
