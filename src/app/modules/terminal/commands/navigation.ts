import { Card, Directory } from '../../database/services/db';
import { TerminalCommand } from './command';

export const cd: TerminalCommand = {
  name: 'cd',
  group: 'navigation',
  usage: 'cd <path>',
  description: 'go to a directory',
  why:
    'Directories hold cards. Every other command works on the directory you are in, ' +
    'so cd is how you move around.',
  examples: [
    'cd French  # into French',
    'cd French/Verbs  # several levels at once',
    'cd ..  # one level up',
    'cd /  # to the root',
    'cd `My French`  # backticks for names with spaces',
  ],
  notes: ['Tab completes directory names'],
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
  description: 'show the current path',
  why: 'Shows where you are: the path of the current directory, from the root.',
  examples: ['pwd'],
  run(args, ctx) {
    ctx.out(ctx.terminal.pwd());
  },
};

const formatDir = (dir: Directory) =>
  ` · DIR ${dir.id} ${dir.icon} ${dir.title} [${dir.fields}]`;

const formatCard = (card: Card) =>
  ` · CARD ${card.id} owned by ${card.owner} has sides [${card.contents.join()}] next: ${card.next} prev: ${card.prev} SPEC: ${JSON.stringify(card.spec)}`;

const LS_USAGE = 'Usage: ls [d|c] [page]';

/**
 * What ls was asked for. In any order:
 * · d or -d: directories, c or -c: cards, dc or -dc: both; nothing given means both
 * · a number: the page (the first one by default)
 */
function lsOptions(args: string[]) {
  let dirs = false;
  let cards = false;
  let page: number | undefined;

  for (const arg of args) {
    if (/^\d+$/.test(arg)) {
      if (page !== undefined) throw new Error(LS_USAGE);
      page = Number(arg);
      if (page < 1) throw new Error('Pages are counted from 1');
      continue;
    }
    const letters = arg.startsWith('-') ? arg.slice(1) : arg;
    if (!/^[dc]+$/.test(letters)) throw new Error(LS_USAGE);
    if (letters.includes('d')) dirs = true;
    if (letters.includes('c')) cards = true;
  }

  if (!dirs && !cards) dirs = cards = true;
  return { dirs, cards, page: page ?? 1 };
}

export const ls: TerminalCommand = {
  name: 'ls',
  group: 'navigation',
  usage: 'ls [d|c] [page]',
  description: 'list directories and cards here',
  why:
    'Shows what is in the current directory: directories and cards, with their ids ' +
    '(rmdir needs an id).',
  examples: [
    'ls  # directories and cards',
    'ls d  # only directories (ls -d works too)',
    'ls c  # only cards (ls -c works too)',
    'ls 2  # the second page',
    'ls c 3  # the third page of cards',
  ],
  notes: [
    'A page holds 20 items, directories first, then cards; the last line says which page it is',
    'Output: DIR <id> <icon> <title> [sides] and CARD <id> ... sides [...]',
  ],
  async run(args, ctx) {
    const { dirs, cards, page } = lsOptions(args);
    const listing = await ctx.core.list(ctx.terminal.getCDI(), { dirs, cards }, page);

    const lines = [...listing.dirs.map(formatDir), ...listing.cards.map(formatCard)];
    if (listing.pages > 1) {
      /** the hint repeats the filter, so the next page is of the same listing */
      const filter = dirs && !cards ? 'd ' : cards && !dirs ? 'c ' : '';
      const next =
        listing.page < listing.pages
          ? ` (ls ${filter}${listing.page + 1} for the next page)`
          : '';
      lines.push(`╰─ page ${listing.page} of ${listing.pages}${next}`);
    }
    if (lines.length > 0) ctx.out(lines.join('\n'));
  },
  async complete(partial) {
    return ['d', 'c', '-d', '-c'].filter((name) => name.startsWith(partial));
  },
};
