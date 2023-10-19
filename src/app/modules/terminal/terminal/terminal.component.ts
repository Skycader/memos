import { Component } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
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
  public terminalModel: string =
    'Current path: ' + this.terminal.pwd() + '\n$ ';

  constructor(private terminal: TerminalService, private core: CoreService) {}

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
    let cmd = command.split(' ')[0];
    console.log(cmd);
    switch (cmd) {
      case 'help':
        return this.helpMessage;
      case 'mkdir':
        this.core.mkdir(
          command.split(' ')[1],
          command.split(' ')[2],
          command.split(' ')[3],
          command.split(' ')[4]
        );
        return '';
      case 'uname':
        return 'memos 2.0 software by vodri';
      case 'platforminfo':
        return window.navigator.appVersion;
      case 'cd':
        console.log('CD TO', command.split(' ')[1]);
        this.terminal.cd(command.split(' ')[1]);
        return '';
      case 'clear':
        this.clearTerminal();
        return '';
      case 'pwd':
        return 'Working dir: ' + this.terminal.pwd();
      default:
        return '';
    }
  }

  public clearTerminal() {
    setTimeout(() => {
      this.terminalModel = 'Current path: ' + this.terminal.pwd() + '\n$ ';
    });
  }

  public formatTerminal() {
    this.terminalModel = 'Current path: ' + this.terminal.pwd() + '\n$ ';
  }

  public emitTerminal() {
    setTimeout(() => {
      this.terminalModel += this.command(
        this.terminalModel
          .split('\n')
          .at(-2)
          ?.replaceAll('$', '')
          .replace(' ', '')
      );

      this.terminalModel +=
        '\n' + 'Current path: ' + this.terminal.pwd() + '\n$ ';
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
