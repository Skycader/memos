import { Component } from '@angular/core';
import { TerminalService } from '../services/terminal.service';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss'],
})
export class TerminalComponent {
  public helpMessage = `
  Memos Terminal 2.0 by Vodri
  List of available commands:
  · mkdir <icon> <title> <sides> - create catalog
  Example: mkdir 🇫🇷 French Original Translation
  `;
  public terminalModel: string = '$ ';

  constructor(private terminal: TerminalService) {}

  public type(value: string) {
    let element = document.querySelector('textarea') as any;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
    setTimeout(() => {
      this.middleware();
    });
  }

  public output(value: string) {
    console.log('OUTPUTTING: ', value);
    setTimeout(() => {
      this.terminalModel += value;
    });
  }

  public command(command: any): string {
    console.log('COMMAND: ', command);
    switch (command) {
      case 'help':
        return this.helpMessage;
      case 'clear':
        this.clearTerminal();
        return '';
      case 'pwd':
        return 'Working tree: ' + this.terminal.pwd();
      default:
        return '';
    }
  }

  public clearTerminal() {
    setTimeout(() => {
      this.terminalModel = '$ ';
    });
  }

  public formatTerminal() {
    this.terminalModel = '$ ';
  }

  public emitTerminal() {
    setTimeout(() => {
      this.terminalModel += this.command(
        this.terminalModel
          .split('\n')
          .at(-2)
          ?.replaceAll('$', '')
          .replaceAll(' ', '')
      );

      this.terminalModel += '\n$ ';
    });
  }

  public middleware() {
    this.terminalModel.length < 3 ? this.formatTerminal() : '';
    // this.terminalModel = this.terminalModel
    //   .split('\n')
    //   .filter((line: string) => line === '')
    //   .join('\n');

    this.terminalModel.split('\n').at(-1) === '' ? this.emitTerminal() : '';
    this.terminalModel.split('\n').at(-1) === '$ ' ? this.emitTerminal() : '';
    this.terminalModel.split('\n').at(-1) === '$' ? this.emitTerminal() : '';
  }
}
