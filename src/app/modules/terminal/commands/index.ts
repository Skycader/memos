import { TerminalCommand } from './command';
import { doctor, test } from './diagnostics';
import { mkdir, rmdir, touch } from './edit';
import { cd, ls, lsdir, pwd } from './navigation';
import { clear, drop, font, help, theme } from './system';

/**
 * The registry: every command of the terminal is listed here, once.
 * The order is the order in help. To add a command, write it and put it in this list
 */
export const COMMANDS: TerminalCommand[] = [
  cd,
  pwd,
  lsdir,
  ls,
  mkdir,
  touch,
  rmdir,
  help,
  clear,
  theme,
  font,
  drop,
  test,
  doctor,
];

/**
 * Find a command by its name or alias
 */
export function findCommand(name: string): TerminalCommand | undefined {
  return COMMANDS.find(
    (command) => command.name === name || command.aliases?.includes(name)
  );
}

/**
 * All names that can be typed, for completion
 */
export function allCommandNames(): string[] {
  return COMMANDS.flatMap((command) => [command.name, ...(command.aliases ?? [])]);
}
