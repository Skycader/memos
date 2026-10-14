import { Card } from '../../database/services/db';
import { TerminalCommand } from './command';

export const cd: TerminalCommand = {
  name: 'cd',
  group: 'navigation',
  usage: 'cd <path>',
  description: 'go to a directory',
  notes: [
    'A path is a name, .., / or several of them: French, .., /, French/Verbs, ../Spanish',
    'Example: cd French',
    'Example: cd "My French" (quotes for names with spaces)',
  ],
  async run(args, ctx) {
    const target = args.at(0);
    if (target === undefined) throw new Error('Usage: cd <path>');
    await ctx.terminal.cd(target);
  },
  async complete(partial, ctx) {
    const cut = partial.lastIndexOf('/') + 1;
    const base = partial.slice(0, cut);
    const rest = partial.slice(cut);
    try {
      const dir = base
        ? await ctx.terminal.resolve(ctx.terminal.getPath(), base)
        : ctx.terminal.getPath();
      const dirs = await ctx.core.lsdir(dir.at(-1)?.id ?? '/', 0);
      return dirs
        .map((item) => item.title)
        .filter((title) => title.startsWith(rest))
        .map((title) => base + title);
    } catch {
      return [];
    }
  },
};

export const pwd: TerminalCommand = {
  name: 'pwd',
  group: 'navigation',
  usage: 'pwd',
  description: 'display current path',
  run(args, ctx) {
    ctx.out(ctx.terminal.pwd());
  },
};

export const lsdir: TerminalCommand = {
  name: 'lsdir',
  aliases: ['lsd', 'dir'],
  group: 'navigation',
  usage: 'lsdir',
  description: 'list directories in the current directory',
  notes: ['Output: DIR <id> <icon> <title> [sides]'],
  async run(args, ctx) {
    const dirs = await ctx.core.lsdir(ctx.terminal.getCDI(), 0);
    if (dirs.length === 0) return;
    ctx.out(
      dirs
        .map((dir) => ` · DIR ${dir.id} ${dir.icon} ${dir.title} [${dir.fields}]`)
        .join('\n')
    );
  },
};

export const ls: TerminalCommand = {
  name: 'ls',
  group: 'navigation',
  usage: 'ls',
  description: 'list cards in the current directory (first 10)',
  async run(args, ctx) {
    const cards: Card[] = await ctx.core.ls(ctx.terminal.getCDI(), 0);
    if (cards.length === 0) return;
    ctx.out(
      cards
        .map(
          (card) =>
            ` · CARD ${card.id} owned by ${card.owner} has sides [${card.contents.join()}] next: ${card.next} prev: ${card.prev} SPEC: ${JSON.stringify(card.spec)}`
        )
        .join('\n')
    );
  },
};
