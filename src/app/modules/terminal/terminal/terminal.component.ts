import { Component } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { Command } from '../models/command.model';
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
  public terminalModel: string = '';

  constructor(private terminal: TerminalService, private core: CoreService) {}

  public ngOnInit() {
    this.clearTerminal();
  }
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

  public command(command: Command): string {
    console.log('COMMAND: ', command);
    let cmd = command.at(0);
    console.log(cmd);
    switch (cmd) {
      case 'help':
        return this.helpMessage;
      case 'mkdir':
        this.core.mkdir(
          command.at(1),
          command.at(2),
          [command.at(3)],
          command.at(4)
        );
        return '';
      case 'uname':
        return 'memos 2.0 software by vodri';
      case 'sysinfo':
        return window.navigator.appVersion;
      case 'cd':
        console.log('CD TO', command.at(1));
        this.terminal.cd(command.at(1));
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
      this.terminalModel = '╭─root@chrome ' + this.terminal.pwd() + '\n╰─$ ';
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
          ?.replaceAll('╰─$', '')
          .replace(' ', '') as Command
      );

      this.terminalModel +=
        '\n' + '╭─root@chrome ' + this.terminal.pwd() + '\n╰─$ ';
    });
  }

  public middleware() {
    this.terminalModel.length < 3 ? this.formatTerminal() : '';
    // this.terminalModel = this.terminalModel
    //   .split('\n')
    //   .filter((line: string) => line === '')
    //   .join('\n');

    this.terminalModel.split('\n').at(-1) === '' ? this.emitTerminal() : '';
    this.terminalModel.split('\n').at(-1) === '╰─$' ? this.emitTerminal() : '';
  }
}
