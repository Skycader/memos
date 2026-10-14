import { Card, Directory } from '../../database/services/db';
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

const formatDir = (dir: Directory) =>
  ` · DIR ${dir.id} ${dir.icon} ${dir.title} [${dir.fields}]`;

const formatCard = (card: Card) =>
  ` · CARD ${card.id} owned by ${card.owner} has sides [${card.contents.join()}] next: ${card.next} prev: ${card.prev} SPEC: ${JSON.stringify(card.spec)}`;

export const lsdir: TerminalCommand = {
  name: 'lsdir',
  aliases: ['dir'],
  group: 'navigation',
  usage: 'lsdir',
  description: 'list directories in the current directory (same as ls d)',
  notes: ['Output: DIR <id> <icon> <title> [sides]'],
  async run(args, ctx) {
    const dirs = await ctx.core.lsdir(ctx.terminal.getCDI(), 0);
    if (dirs.length === 0) return;
    ctx.out(dirs.map(formatDir).join('\n'));
  },
};

/**
 * Which kinds of things ls was asked for: nothing given means both
 * d or -d: directories, c or -c: cards, dc or -dc: both
 */
function lsKinds(args: string[]): { dirs: boolean; cards: boolean } {
  if (args.length === 0) return { dirs: true, cards: true };
  let dirs = false;
  let cards = false;
  for (const arg of args) {
    const letters = arg.startsWith('-') ? arg.slice(1) : arg;
    if (!/^[dc]+$/.test(letters)) throw new Error('Usage: ls [d|c]');
    if (letters.includes('d')) dirs = true;
    if (letters.includes('c')) cards = true;
  }
  return { dirs, cards };
}

export const ls: TerminalCommand = {
  name: 'ls',
  group: 'navigation',
  usage: 'ls [d|c]',
  description: 'list directories and cards in the current directory',
  notes: [
    'ls d (or ls -d) - only directories',
    'ls c (or ls -c) - only cards (the first 10)',
    'Output: DIR <id> <icon> <title> [sides] and CARD <id> ... sides [...]',
  ],
  async run(args, ctx) {
    const kinds = lsKinds(args);
    const owner = ctx.terminal.getCDI();
    const lines: string[] = [];

    if (kinds.dirs) lines.push(...(await ctx.core.lsdir(owner, 0)).map(formatDir));
    if (kinds.cards) lines.push(...(await ctx.core.ls(owner, 0)).map(formatCard));

    if (lines.length > 0) ctx.out(lines.join('\n'));
  },
  async complete(partial) {
    return ['d', 'c', '-d', '-c'].filter((name) => name.startsWith(partial));
  },
};
