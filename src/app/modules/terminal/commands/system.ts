import { TerminalCommand } from './command';

/**
 * Not implemented yet. Move a line out of here when it works
 */
const PLANNED = [
  'touch ?"Un chat" "A cat" - make a side question only',
  'rmdir <dir name> - remove a directory by name',
];

export const help: TerminalCommand = {
  name: 'help',
  group: 'system',
  usage: 'help',
  description: 'show this message',
  run(args, ctx) {
    const lines = ['', '  Memos Terminal 2.0 by Vodri', '  List of available commands:'];
    let group = ctx.commands[0]?.group;

    for (const command of ctx.commands) {
      if (command.group !== group) {
        lines.push('');
        group = command.group;
      }
      lines.push(`  · ${command.usage} - ${command.description}`);
      for (const note of command.notes ?? []) lines.push(`  ╰─ ${note}`);
      if (command.aliases?.length)
        lines.push(`  ╰─ Try also: ${command.aliases.join(' or ')}`);
    }

    lines.push('', '  Planned (not implemented yet):');
    for (const item of PLANNED) lines.push(`  · ${item}`);
    lines.push('');
    ctx.out(lines.join('\n'));
  },
};

export const clear: TerminalCommand = {
  name: 'clear',
  group: 'system',
  usage: 'clear',
  description: 'clear terminal (Ctrl+L does the same)',
  run(args, ctx) {
    ctx.clear();
  },
};

export const theme: TerminalCommand = {
  name: 'theme',
  group: 'system',
  usage: 'theme [dark|light]',
  description: 'switch the color theme (remembered between sessions)',
  notes: ['theme - show the current theme'],
  run(args, ctx) {
    const name = args.at(0);
    if (name === undefined) {
      ctx.out(`Theme: ${ctx.theme.current}`);
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

export const drop: TerminalCommand = {
  name: 'drop',
  group: 'system',
  usage: 'drop',
  description: 'erase the WHOLE database (no confirmation!)',
  async run(args, ctx) {
    await ctx.core.drop();
    ctx.terminal.setPath([]);
    ctx.out('Database erased');
  },
};
