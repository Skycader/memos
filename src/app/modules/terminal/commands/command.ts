import { CoreService } from '../../core/services/core.service';
import { ThemeService } from '../../core/services/theme.service';
import { DebugService } from '../../debug/services/debug.service';
import { DoctorService } from '../../debug/services/doctor.service';
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
 * Everything a command gets to work with
 */
export interface CommandContext extends Output {
  /** session: current directory and navigation */
  terminal: TerminalService;
  core: CoreService;
  debug: DebugService;
  doctor: DoctorService;
  theme: ThemeService;
  /** the registry, for help */
  commands: TerminalCommand[];
  /** run a command line and collect what it printed, used by the self-test */
  capture(line: string): Promise<{ out: string; err: string }>;
}

export interface TerminalCommand {
  name: string;
  /** other names of the same command, for example lsd and dir for lsdir */
  aliases?: string[];
  /** how to call it: `mkdir <icon> <title> <sides...>` */
  usage: string;
  description: string;
  /** extra lines for help, examples and warnings */
  notes?: string[];
  /** commands of one group go together in help */
  group: 'navigation' | 'edit' | 'system' | 'diagnostics';
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
