import { Component, ElementRef, ViewChild } from '@angular/core';
import { Output } from '../commands/command';
import { ShellService } from '../services/shell.service';

interface Line {
  kind: 'cmd' | 'out' | 'err';
  text: string;
}

/** the screen keeps this many lines, older ones are dropped */
const MAX_LINES = 1000;

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss'],
})
export class TerminalComponent {
  /**
   * The view of the terminal: shows what happened and takes input.
   * It knows nothing about commands, ShellService runs them
   *
   * State, kept apart instead of one big text:
   * · lines   - everything printed so far
   * · input   - what is being typed right now
   * · history - commands entered before, for ↑ and ↓
   */
  public lines: Line[] = [];
  public input = '';
  public busy = false;

  private queue: string[] = [];
  private history: string[] = [];
  private historyIndex = 0;
  /** what was typed before browsing history, to come back to it with ↓ */
  private draft = '';

  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('screen') screen!: ElementRef<HTMLElement>;

  constructor(private shell: ShellService) {}

  /**
   * looks like
   * ╭─axl@memos /
   * ╰─$
   */
  public get promptTop(): string {
    return '╭─axl@memos ' + this.shell.terminal.pwd();
  }

  public ngAfterViewInit() {
    this.focus();
  }

  public focus() {
    this.inputRef?.nativeElement.focus();
  }

  /**
   * Where commands print to
   */
  private output: Output = {
    out: (text) => this.print('out', text),
    err: (text) => this.print('err', '(!) ' + text),
    clear: () => (this.lines = []),
  };

  private print(kind: Line['kind'], text: string) {
    this.lines.push({ kind, text });
    if (this.lines.length > MAX_LINES) this.lines.splice(0, this.lines.length - MAX_LINES);
    this.scrollDown();
  }

  /**
   * Enter: run what is typed
   */
  public async submit() {
    const line = this.input;
    this.input = '';
    if (line.trim() !== '' && this.history.at(-1) !== line) this.history.push(line);
    this.historyIndex = this.history.length;
    this.draft = '';

    /**
     * Typing ahead while a command is running is fine:
     * the lines wait in the queue and run one after another, as in a shell
     */
    this.queue.push(line);
    if (this.busy) return;

    this.busy = true;
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift() as string;
        this.print('cmd', `${this.promptTop}\n╰─$ ${next}`);
        await this.shell.run(next, this.output);
      }
    } finally {
      this.busy = false;
      this.scrollDown();
    }
  }

  public async onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.browseHistory(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.browseHistory(1);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      await this.complete();
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      this.lines = [];
    }
  }

  private browseHistory(step: number) {
    const next = this.historyIndex + step;
    if (next < 0 || next > this.history.length) return;
    if (this.historyIndex === this.history.length) this.draft = this.input;
    this.historyIndex = next;
    this.input = next === this.history.length ? this.draft : this.history[next];
  }

  /**
   * Tab: complete the command or the last word.
   * When there are several options, show them under the line, like a shell does
   */
  private async complete() {
    const typed = this.input;
    const { buffer, options } = await this.shell.complete(typed);
    /** the line changed while we were looking (Enter, more typing): the result is stale */
    if (this.input !== typed) return;
    if (options.length > 1) {
      this.print('cmd', `${this.promptTop}\n╰─$ ${typed}`);
      this.print('out', options.join('  '));
    }
    this.input = buffer;
  }

  private scrollDown() {
    setTimeout(() => {
      const element = this.screen?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }
}
