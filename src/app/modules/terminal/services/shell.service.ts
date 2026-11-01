import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { FontService } from '../../core/services/font.service';
import { ThemeService } from '../../core/services/theme.service';
import { DebugService } from '../../debug/services/debug.service';
import { DoctorService } from '../../debug/services/doctor.service';
import { SeedService } from '../../debug/services/seed.service';
import { ExchangeService } from '../../exchange/exchange.service';
import { FileService } from '../../exchange/file.service';
import { allCommandNames, COMMANDS, findCommand } from '../commands';
import { CommandContext, Output, Question } from '../commands/command';
import { TerminalService } from './terminal.service';
import { QUOTE, tokenize } from './tokenizer';

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
    private files: FileService,
    private seed: SeedService
  ) {}

  /** set while a command waits for the user to type an answer, see ask */
  private waiting: ((line: string) => void) | null = null;

  /** what the waiting command asks: the view draws it as the prompt */
  public question: Question | null = null;

  /**
   * Is a command waiting for an answer? Then the next line typed is that answer,
   * not a command: the view hands it over with answer()
   */
  public get asking(): boolean {
    return this.waiting !== null;
  }

  /**
   * The line the user typed to answer a question of a command
   */
  public answer(line: string): void {
    const waiting = this.waiting;
    this.waiting = null;
    this.question = null;
    waiting?.(line);
  }

  /**
   * Ask to confirm: show the question, wait for the answer, agree only to the exact word.
   * @param answers if given (a test), the answers come from it and nobody is waited for;
   * when it runs out, the answer is an empty line. The question is printed as plain text then;
   * for the user the view draws it as the prompt (see question)
   */
  private async confirm(question: Question, io: Output, answers?: string[]): Promise<boolean> {
    let line: string;
    if (answers) {
      const [first = '', ...rest] = question.notes;
      io.out(
        [`(!) ${first}`, ...rest.map((note) => `    ${note}`), `Type ${question.word} to confirm:`].join(
          '\n'
        )
      );
      line = answers.shift() ?? '';
    } else {
      line = await new Promise<string>((resolve) => {
        this.question = question;
        this.waiting = resolve;
      });
    }
    return line.trim() === question.word;
  }

  /**
   * Run one command line. Never throws: errors go to io.err
   * @param answers what to answer if the command asks questions (for tests), see ask
   */
  public async run(line: string, io: Output, answers?: string[]): Promise<void> {
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
      await command.run(args, this.context(io, answers));
    } catch (e: any) {
      io.err(e?.message ?? 'Unexpected error');
    }
  }

  /**
   * Run a command line and return what it printed
   * @param answers what to answer if the command asks questions; nobody is waited for here,
   * so a question with no answer left gets an empty line
   */
  public async capture(
    line: string,
    answers: string[] = []
  ): Promise<{ out: string; err: string }> {
    const out: string[] = [];
    const err: string[] = [];
    await this.run(
      line,
      {
        out: (text) => out.push(text),
        err: (text) => err.push(text),
        clear: () => {},
      },
      [...answers]
    );
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
      /**
       * A name that is typed in full wins over longer ones (rm over rmdir):
       * Tab adds the space, and the next Tab completes the argument
       */
      if (names.includes(buffer)) return { buffer: buffer + ' ', options: [] };
      return this.apply(buffer, 0, names, ' ', false);
    }

    const command = findCommand(buffer.slice(0, firstSpace));
    if (!command?.complete) return { buffer, options: [] };

    /** the last word, or everything after the last opening quote */
    const quotes = buffer.split(QUOTE).length - 1;
    const start = quotes % 2 === 1 ? buffer.lastIndexOf(QUOTE) : buffer.search(/\S*$/);
    const quoted = buffer[start] === QUOTE;
    const partial = buffer.slice(quoted ? start + 1 : start);

    const options = await command.complete(partial, this.context(this.silent, []));
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
    const wrap = !quoted && /\s/.test(common) ? QUOTE : '';
    const text =
      buffer.slice(0, start) +
      (quoted ? QUOTE : wrap) +
      common +
      (single && (quoted || wrap) ? QUOTE : '') +
      (single ? suffix : '');
    return { buffer: text, options: single ? [] : options };
  }

  private silent: Output = { out: () => {}, err: () => {}, clear: () => {} };

  private context(io: Output, answers?: string[]): CommandContext {
    return {
      ...io,
      confirm: (question) => this.confirm(question, io, answers),
      terminal: this.terminal,
      core: this.core,
      debug: this.debug,
      doctor: this.doctor,
      theme: this.theme,
      font: this.font,
      exchange: this.exchange,
      files: this.files,
      seed: this.seed,
      commands: COMMANDS,
      capture: (line, given) => this.capture(line, given),
      complete: (buffer) => this.complete(buffer),
    };
  }
}
