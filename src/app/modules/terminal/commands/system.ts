import { FONTS, LINE_DEFAULT, LINE_MAX, LINE_MIN } from '../../core/services/font.service';
import { TerminalCommand } from './command';

/**
 * Not implemented yet. Move a line out of here when it works
 */
const PLANNED = [
  'cp <what> <where> - copy a card or a directory',
  'rename <what> <new title> - rename a directory',
];

/**
 * The look of help, indented so nothing sticks to the left edge:
 *  * System                      <- GROUP: a title with a marker
 *
 *     · help - show the commands <- ITEM: a line under a title
 *     plain text                 <- BODY: text under a title
 */
const TITLE = ' ';
const GROUP = ' * ';
const BODY = '    ';
const ITEM = '    · ';

/**
 * The titles of the groups, in the order `help` shows them
 */
const GROUPS: [TerminalCommand['group'], string][] = [
  ['navigation', 'Navigation'],
  ['edit', 'Data manipulation'],
  ['repeat', 'Repetition'],
  ['data', 'Import and export'],
  ['system', 'System'],
  ['diagnostics', 'Testing and diagnostics'],
];

/**
 * Plain `help`: the groups, and one short line for every command
 */
function overview(commands: TerminalCommand[]): string {
  const lines = [
    '',
    `${TITLE}Memos Terminal 2.0 by Vodri`,
    `${TITLE}Type help <command> for details and examples, for example: help touch`,
    '',
  ];
  for (const [group, title] of GROUPS) {
    const inGroup = commands.filter((command) => command.group === group);
    if (inGroup.length === 0) continue;
    lines.push(`${GROUP}${title}`, '');
    for (const command of inGroup)
      lines.push(
        `${ITEM}${command.name} - ${command.description} (type help ${command.name} for more)`
      );
    lines.push('');
  }
  lines.push(`${GROUP}Planned (not implemented yet)`, '');
  for (const item of PLANNED) lines.push(`${ITEM}${item}`);
  return withBlankLineAfter(lines);
}

/**
 * The text of a help ends with ONE empty line before the next prompt.
 * A single trailing line break is not drawn by the browser, so two are needed
 */
function withBlankLineAfter(lines: string[]): string {
  return [...lines, '', ''].join('\n');
}

/**
 * `help <command>`: what it is for, examples, rules
 */
function details(command: TerminalCommand): string {
  const lines = [
    '',
    `${TITLE}${command.usage}`,
    `${TITLE}${command.description}`,
    '',
    `${GROUP}Why`,
    `${BODY}${command.why}`,
    '',
    `${GROUP}Examples`,
    ...command.examples.map((example) => `${BODY}${example}`),
  ];
  if (command.notes?.length)
    lines.push('', `${GROUP}Notes`, ...command.notes.map((note) => `${ITEM}${note}`));
  if (command.aliases?.length)
    lines.push('', `${TITLE}Also typed as: ${command.aliases.join(', ')}`);
  return withBlankLineAfter(lines);
}

export const help: TerminalCommand = {
  name: 'help',
  group: 'system',
  usage: 'help [command]',
  description: 'show the commands, or the details of one',
  why:
    'Lists the commands by group, one line each. Give it a command name and it explains ' +
    'that command: what it is for, examples and rules.',
  examples: [
    'help  # the list of commands',
    'help touch  # what touch is for, with examples',
  ],
  run(args, ctx) {
    if (args.length > 1) throw new Error('Usage: help [command]');
    const name = args.at(0);
    if (name === undefined) {
      ctx.out(overview(ctx.commands));
      return;
    }
    const command = ctx.commands.find(
      (item) => item.name === name || item.aliases?.includes(name)
    );
    if (!command) throw new Error(`No such command: ${name} (type help for the list)`);
    ctx.out(details(command));
  },
  async complete(partial, ctx) {
    return ctx.commands.map((command) => command.name).filter((name) => name.startsWith(partial));
  },
};

export const clear: TerminalCommand = {
  name: 'clear',
  group: 'system',
  usage: 'clear',
  description: 'clear the screen',
  why: 'Cleans the screen. Your data is not touched.',
  examples: ['clear  # Ctrl+L does the same'],
  run(args, ctx) {
    ctx.clear();
  },
};

export const theme: TerminalCommand = {
  name: 'theme',
  group: 'system',
  usage: 'theme [dark|light]',
  description: 'switch dark / light theme',
  why: 'Switches between the dark and the light color theme. The choice is remembered.',
  examples: [
    'theme dark',
    'theme light',
    'theme  # shows the current theme and the available ones',
  ],
  run(args, ctx) {
    const name = args.at(0);
    if (name === undefined) {
      ctx.out(`Theme: ${ctx.theme.current}\nAvailable: dark, light`);
      return;
    }
    if (!ctx.theme.isTheme(name)) throw new Error('Usage: theme [dark|light]');
    ctx.theme.set(name);
    ctx.out(`Theme: ${name}`);
  },
  async complete(partial) {
    return ['dark', 'light'].filter((name) => name.startsWith(partial));
  },
};

export const font: TerminalCommand = {
  name: 'font',
  group: 'system',
  usage: 'font <JetBrainsMono|default> | font line [1-3|default]',
  description: 'switch the terminal font, or the space between lines',
  why: 'Changes the font of the terminal, or with `line` the space between its lines. The choice is remembered.',
  examples: [
    'font JetBrainsMono',
    'font default  # the browser monospace font',
    'font  # shows the current font and the available ones',
    'font line 1.6  # more air between the lines (from 1 to 3)',
    'font line default  # the standard space, 1.25',
    'font line  # shows the current space',
  ],
  run(args, ctx) {
    const name = args.at(0);
    if (name === undefined) {
      ctx.out(`Font: ${ctx.font.current}\nAvailable: ${FONTS.join(', ')}`);
      return;
    }
    if (name.toLowerCase() === 'line') {
      const value = args.at(1);
      if (value === undefined) {
        ctx.out(`Line space: ${ctx.font.line} (from ${LINE_MIN} to ${LINE_MAX}, default ${LINE_DEFAULT})`);
        return;
      }
      const line = ctx.font.parseLine(value);
      if (line === undefined) throw new Error(`Usage: font line <${LINE_MIN}-${LINE_MAX}|default>`);
      ctx.font.setLine(line);
      ctx.out(`Line space: ${line}`);
      return;
    }
    const found = ctx.font.find(name);
    if (!found) throw new Error(`Usage: font <${FONTS.join('|')}>`);
    ctx.font.set(found);
    ctx.out(`Font: ${found}`);
  },
  async complete(partial) {
    return [...FONTS, 'line'].filter((name) => name.toLowerCase().startsWith(partial.toLowerCase()));
  },
};

export const drop: TerminalCommand = {
  name: 'drop',
  group: 'system',
  usage: 'drop',
  description: 'erase the WHOLE database (asks to confirm)',
  why: 'Erases everything in the current database, all directories and cards, for a fresh start.',
  examples: [
    'drop  # asks you to type drop to confirm',
    'drop  # then type: drop',
  ],
  notes: [
    'Asks "Type drop to confirm"; any other answer cancels and nothing is erased',
    'There is no undo: export first if in doubt',
    'Your theme and font are kept',
  ],
  async run(args, ctx) {
    if (args.length > 0) throw new Error('Usage: drop');

    const agreed = await ctx.confirm({
      notes: ['This will erase ALL directories and cards of the current database, for good.'],
      word: 'drop',
    });
    if (!agreed) {
      ctx.out('Cancelled: nothing was erased');
      return;
    }

    await ctx.core.drop();
    ctx.terminal.setPath([]);
    ctx.out('Database erased');
  },
};
