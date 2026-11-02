import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CardView, Chip, Output, Question } from '../commands/command';
import { ShellService } from '../services/shell.service';

interface Line {
  kind: 'cmd' | 'out' | 'err' | 'ask' | 'card' | 'chips';
  text: string;
  /** an answered question, drawn as the prompt it was asked with */
  question?: Question;
  /** who and where the question was asked, the first line of its frame */
  host?: string;
  /** an answered card of the repetition mode, drawn as it was shown */
  card?: CardView;
  /** a row of chips */
  chips?: Chip[];
}

/** the screen keeps this many lines, older ones are dropped */
const MAX_LINES = 1000;

/** what the hint of a question suggests typing to cancel it (any other answer cancels too) */
const ABORT = 'abort';

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

  private inputElement?: ElementRef<HTMLInputElement>;

  /**
   * The input is created anew when a question appears and when it is answered (another part of
   * the template), and a new input has no focus: the cursor would vanish. So every new input
   * takes the focus at once
   */
  @ViewChild('inputRef')
  set inputRef(element: ElementRef<HTMLInputElement>) {
    const isNew = element && element !== this.inputElement;
    this.inputElement = element;
    if (isNew) element.nativeElement.focus();
  }
  get inputRef(): ElementRef<HTMLInputElement> {
    return this.inputElement as ElementRef<HTMLInputElement>;
  }
  @ViewChild('screen') screen!: ElementRef<HTMLElement>;

  constructor(private shell: ShellService) {}

  /**
   * looks like
   * ╭─axl@memos /
   * ╰─$
   */
  public get promptTop(): string {
    return '╭─' + this.promptHost;
  }

  /** the prompt without its corner: a question draws its own frame */
  public get promptHost(): string {
    return 'axl@memos ' + this.shell.terminal.pwd();
  }

  /** a question of a command is waiting: the prompt turns into the confirmation */
  public get question(): Question | null {
    return this.shell.question;
  }

  /** a card of the repetition mode is shown: the prompt turns into the card */
  public get card(): CardView | null {
    return this.shell.card;
  }

  /**
   * The hint inside the input while a question waits:
   * · nothing typed, or the start of `abort`: the rest of `abort`, the way to cancel (Tab types it)
   * · the start of the word of the question: the rest of the word; what was typed turns red
   * · anything else: no hint
   * The rest is always gray
   */
  public get hint(): { rest: string; kind: 'abort' | 'word' } | null {
    /** a card: the empty input tells which field to type */
    if (this.shell.card) return this.input === '' ? { rest: this.shell.card.want, kind: 'abort' } : null;
    const word = this.shell.question?.word;
    if (!word) return null;
    const typed = this.input;
    if (typed !== '' && word.startsWith(typed)) {
      return { rest: word.slice(typed.length), kind: 'word' };
    }
    if (ABORT.startsWith(typed)) return { rest: ABORT.slice(typed.length), kind: 'abort' };
    return null;
  }

  public ngAfterViewInit() {
    this.focus();
  }

  public focus() {
    this.inputRef?.nativeElement.focus();
  }

  /**
   * A click on the screen puts the cursor back into the input, except when the user has just
   * selected some text: focusing the input would drop their selection, and the text could
   * not be copied
   */
  public onScreenClick() {
    if (window.getSelection()?.toString()) return;
    this.focus();
  }

  /**
   * Typing while the input has no focus (for example after selecting text) goes to the input.
   * Shortcuts such as Ctrl+C stay untouched, so a selection can be copied
   */
  @HostListener('document:keydown', ['$event'])
  public onDocumentKeydown(event: KeyboardEvent) {
    const input = this.inputRef?.nativeElement;
    if (!input || event.target === input) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length === 1 || event.key === 'Backspace') input.focus();
  }

  /**
   * Where commands print to
   */
  private output: Output = {
    out: (text) => this.print('out', text),
    chips: (items) => {
      this.lines.push({ kind: 'chips', text: items.map((item) => item.text).join(' '), chips: items });
      this.scrollDown();
    },
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

    /**
     * A command is waiting for an answer (to confirm something): this line is the answer.
     * It is shown, but it is not a command: it does not go to the history or the queue
     */
    if (this.shell.asking) {
      /** an empty line is not an answer to a card, the card stays */
      if (this.shell.card && line.trim() === '') return;
      this.answer(line);
      return;
    }

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

  /**
   * Answer the question of a command: it stays on the screen as it was asked, with the answer
   */
  private answer(line: string) {
    const question = this.shell.question;
    const card = this.shell.card;
    if (question) this.lines.push({ kind: 'ask', text: line, question, host: this.promptHost });
    if (card) this.lines.push({ kind: 'card', text: line, card, host: this.promptHost });
    this.shell.answer(line);
    this.scrollDown();
  }

  public async onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.shell.asking) {
      event.preventDefault();
      this.input = '';
      /** Esc leaves the repetition mode, and cancels a confirmation */
      this.answer(this.shell.card ? '/exit' : '');
    } else if (event.key === 'ArrowUp') {
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
    /**
     * Under a question Tab completes only `abort`: the word that confirms is never typed for the
     * user, so that a confirmation can not pass by a stray key
     */
    if (this.shell.asking) {
      const card = this.shell.card;
      if (card) {
        /** a card: Tab completes the commands of the mode, `/p` -> `/postpone` */
        if (!this.input.startsWith('/') || /\s/.test(this.input)) return;
        const found = card.commands.filter((name) => name.startsWith(this.input));
        if (found.length === 1) this.input = found[0] + ' ';
        else if (found.length > 1) this.input = this.common(found);
      } else if (this.hint?.kind === 'abort') this.input = ABORT;
      return;
    }
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

  /** the longest start that all of the words share */
  private common(words: string[]): string {
    let start = words[0];
    for (const word of words) while (!word.startsWith(start)) start = start.slice(0, -1);
    return start;
  }

  private scrollDown() {
    setTimeout(() => {
      const element = this.screen?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }
}
