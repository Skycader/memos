import { Card } from '../../database/services/db';
import { TerminalCommand } from './command';
import { formatCard } from './navigation';

const FIND_USAGE = 'Usage: find [-c <directory>]... <text>';

/**
 * What `find` was asked for: the text, and the directories to look in (as typed)
 * · every word that is not an option is a part of the text, so `find Un chat` is `find \`Un chat\``
 * · `-c <directory>` (a title, an id or a path) names a directory to search in; it can be
 *   repeated for several. Options are read only before the text starts, so a text may hold `-c`
 */
export function parseFind(args: string[]): { text: string; directories: string[] } {
  const directories: string[] = [];
  let at = 0;
  while (args[at] === '-c') {
    const name = args[at + 1];
    if (name === undefined) throw new Error(FIND_USAGE);
    directories.push(name);
    at += 2;
  }
  const text = args.slice(at).join(' ').trim();
  if (text === '') throw new Error(FIND_USAGE);
  return { text, directories };
}

export const find: TerminalCommand = {
  name: 'find',
  group: 'navigation',
  usage: 'find [-c <directory>]... <text>',
  description: 'find cards by the text of their sides',
  why:
    'Looks for the text in the sides of the cards, in the current directory and everything under it, ' +
    'and prints each card with the full path of its directory, every part with its icon.',
  examples: [
    'find Un chat  # the same as find `Un chat`: no quotes needed',
    'find -c French Un chat  # only in the directories called French',
    'find -c aB3x Un chat  # only in the directory with this id',
    'find -c French -c Spanish chat  # in several directories',
    'find -c /French/Verbs chat  # a path works too',
  ],
  notes: [
    'Cards only; the case of letters does not matter, a part of a side is enough',
    '-c takes a title, an id or a path; a title is looked for in the whole database, so every directory with that title is searched',
    'Everything after the -c options is the text, spaces included',
    'When nothing is found it says so: that is not an error',
  ],
  async run(args, ctx) {
    const { text, directories } = parseFind(args);

    /** where to look: the current directory by default, else the named ones */
    const scopes: string[] = [];
    for (const name of directories) {
      if (name.includes('/')) {
        const path = await ctx.terminal.resolve(ctx.terminal.getPath(), name);
        scopes.push(path.at(-1)?.id ?? '/');
        continue;
      }
      const named = await ctx.core.dirsNamed(name);
      if (named.length === 0) throw new Error(`There is no directory "${name}" (see ls)`);
      scopes.push(...named.map((dir) => dir.id));
    }
    if (directories.length === 0) scopes.push(ctx.terminal.getCDI());

    const found = await ctx.core.search(text, scopes);
    if (found.length === 0) {
      ctx.out('Nothing found');
      return;
    }

    /** the cards of one directory go under its full path */
    const lines: string[] = [];
    let last: string | undefined;
    for (const item of found) {
      /** every part of the path has its icon right before its title: /🌎 Languages/🇫🇷 French */
      if (item.dir.id !== last) lines.push(item.shown);
      last = item.dir.id;
      lines.push(formatCard(item.card as Card));
    }
    lines.push(`Found ${found.length} card${found.length === 1 ? '' : 's'}`);
    ctx.out(lines.join('\n'));
  },
  async complete(partial) {
    return ['-c'].filter((name) => name.startsWith(partial));
  },
};
