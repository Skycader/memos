import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { FontService } from '../../core/services/font.service';
import { ThemeService } from '../../core/services/theme.service';
import { DebugService } from '../../debug/services/debug.service';
import { DoctorService } from '../../debug/services/doctor.service';
import { ExchangeService } from '../../exchange/exchange.service';
import { FileService } from '../../exchange/file.service';
import { allCommandNames, COMMANDS, findCommand } from '../commands';
import { CommandContext, Output } from '../commands/command';
import { TerminalService } from './terminal.service';
import { tokenize } from './tokenizer';

@Injectable({
  providedIn: 'root',
})
export class ShellService {
  /**
   * Runs command lines: splits a line into words, finds the command in the registry,
   * runs it and routes everything it prints to the given Output.
   * Knows nothing about how the output looks: that is the view's business
   */
  constructor(
    public terminal: TerminalService,
    private core: CoreService,
    private debug: DebugService,
    private doctor: DoctorService,
    private theme: ThemeService,
    private font: FontService,
    private exchange: ExchangeService,
    private files: FileService
  ) {}

  /**
   * Run one command line. Never throws: errors go to io.err
   */
  public async run(line: string, io: Output): Promise<void> {
    let words: string[];
    try {
      words = tokenize(line);
    } catch (e: any) {
      io.err(e.message);
      return;
    }
    if (words.length === 0) return;

    const [name, ...args] = words;
    const command = findCommand(name);
    if (!command) {
      io.err(`Command not found: ${name}`);
      return;
    }

    try {
      await command.run(args, this.context(io));
    } catch (e: any) {
      io.err(e?.message ?? 'Unexpected error');
    }
  }

  /**
   * Run a command line and return what it printed
   */
  public async capture(line: string): Promise<{ out: string; err: string }> {
    const out: string[] = [];
    const err: string[] = [];
    await this.run(line, {
      out: (text) => out.push(text),
      err: (text) => err.push(text),
      clear: () => {},
    });
    return { out: out.join('\n'), err: err.join('\n') };
  }

  /**
   * Tab completion
   * @param buffer what is typed so far
   * @returns the buffer after completion, and the options if there are several
   */
  public async complete(buffer: string): Promise<{ buffer: string; options: string[] }> {
    const firstSpace = buffer.search(/\s/);

    /** the command name is being typed */
    if (firstSpace === -1) {
      const names = allCommandNames().filter((name) => name.startsWith(buffer));
      return this.apply(buffer, 0, names, ' ', false);
    }

    const command = findCommand(buffer.slice(0, firstSpace));
    if (!command?.complete) return { buffer, options: [] };

    /** the last word, or everything after the last opening quote */
    const quotes = (buffer.match(/"/g) ?? []).length;
    const start = quotes % 2 === 1 ? buffer.lastIndexOf('"') : buffer.search(/\S*$/);
    const quoted = buffer[start] === '"';
    const partial = buffer.slice(quoted ? start + 1 : start);

    const options = await command.complete(partial, this.context(this.silent));
    return this.apply(buffer, start, options, '', quoted);
  }

  private apply(
    buffer: string,
    start: number,
    options: string[],
    suffix: string,
    quoted: boolean
  ) {
    if (options.length === 0) return { buffer, options: [] };

    let common = options[0];
    for (const option of options) {
      while (!option.startsWith(common)) common = common.slice(0, -1);
    }

    const single = options.length === 1;
    const wrap = !quoted && /\s/.test(common) ? '"' : '';
    const text =
      buffer.slice(0, start) +
      (quoted ? '"' : wrap) +
      common +
      (single && (quoted || wrap) ? '"' : '') +
      (single ? suffix : '');
    return { buffer: text, options: single ? [] : options };
  }

  private silent: Output = { out: () => {}, err: () => {}, clear: () => {} };

  private context(io: Output): CommandContext {
    return {
      ...io,
      terminal: this.terminal,
      core: this.core,
      debug: this.debug,
      doctor: this.doctor,
      theme: this.theme,
      font: this.font,
      exchange: this.exchange,
      files: this.files,
      commands: COMMANDS,
      capture: (line) => this.capture(line),
      complete: (buffer) => this.complete(buffer),
    };
  }
}
