import { CoreService } from '../../core/services/core.service';
import { FontService } from '../../core/services/font.service';
import { ThemeService } from '../../core/services/theme.service';
import { DebugService } from '../../debug/services/debug.service';
import { DoctorService } from '../../debug/services/doctor.service';
import { SeedService } from '../../debug/services/seed.service';
import { ExchangeService } from '../../exchange/exchange.service';
import { FileService } from '../../exchange/file.service';
import { TerminalService } from '../services/terminal.service';

/**
 * Where a command writes to
 * The terminal view is one implementation, a collector for tests is another
 */
export interface Output {
  out(text: string): void;
  err(text: string): void;
  clear(): void;
}

/**
 * What the shell can do for the self-test: run a whole command line,
 * and complete a half-typed one like Tab does
 */
export interface ShellRunner {
  /** run a command line and collect what it printed */
  capture(line: string): Promise<{ out: string; err: string }>;
  /** what Tab does to the typed text: the completed text, and the options if there are several */
  complete(buffer: string): Promise<{ buffer: string; options: string[] }>;
}

/**
 * Everything a command gets to work with
 */
export interface CommandContext extends Output, ShellRunner {
  /** session: current directory and navigation */
  terminal: TerminalService;
  core: CoreService;
  debug: DebugService;
  doctor: DoctorService;
  theme: ThemeService;
  font: FontService;
  /** export and import of the database as CSV */
  exchange: ExchangeService;
  /** download and the file picker of the browser */
  files: FileService;
  /** test data */
  seed: SeedService;
  /** the registry, for help */
  commands: TerminalCommand[];
}

export interface TerminalCommand {
  name: string;
  /** other names that run the same command (no command has any at the moment) */
  aliases?: string[];
  /** how to call it: `mkdir <icon> <title> <sides...>` */
  usage: string;
  /** one short line: it is shown in the list that plain `help` prints */
  description: string;
  /** what the command is for, in a sentence or two: shown by `help <command>` */
  why: string;
  /**
   * Things to type, one per line; `# text` after two spaces explains it:
   * `touch "Un chat" "A cat"  # quotes for sides with spaces`. Shown by `help <command>`
   */
  examples: string[];
  /** rules, limits and warnings: shown by `help <command>` */
  notes?: string[];
  /** commands of one group go together in help (the titles are in the `help` command) */
  group: 'navigation' | 'edit' | 'data' | 'system' | 'diagnostics';
  /**
   * Run the command. Print with ctx.out / ctx.err, throw to report an error.
   * Async by default: just await, there is no need for placeholders
   */
  run(args: string[], ctx: CommandContext): Promise<void> | void;
  /**
   * Tab completion of the last word: return everything that word can become
   */
  complete?(partial: string, ctx: CommandContext): Promise<string[]>;
}
