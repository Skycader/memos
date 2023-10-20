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
  public terminalWelcomeMsg: string =
    '╭─axl@memos ' + this.terminal.pwd() + '\n╰─$ ';
  constructor(private terminal: TerminalService, private core: CoreService) {}

  public ngOnInit() {
    this.clearTerminal();

    let element: any = document.querySelector('textarea');
    element.addEventListener('click', () => {
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
    });
  }
  public type(value: string) {
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

  public availableCommands: any = {
    help: () => this.helpMessage,
    cd: (args: any) => this.changeDirectory(args),
    '': () => '',
  };

  public changeDirectory(path: string) {
    this.terminal.cd(path);
  }

  public runCommand(command: Command): string {
    const cmd = command.at(0);
    const args: any = command.split(' ').slice(1).join(' ');
    return this.availableCommands[cmd](args) || '';
  }

  public clearTerminal() {
    setTimeout(() => {
      this.terminalModel = this.terminalWelcomeMsg;
    });
  }

  public formatTerminal() {
    this.terminalModel = this.terminalWelcomeMsg;
  }

  public emitTerminal() {
    setTimeout(() => {
      this.terminalModel += this.runCommand(
        this.terminalModel
          .split('\n')
          .at(-2)
          ?.replaceAll('╰─$', '')
          .replace(' ', '') as Command
      );

      this.terminalModel += '\n' + this.terminalWelcomeMsg;
    });
  }

  /**
   * Run between ivoke event and output trigger
   */
  public middleware() {
    this.terminalModel.length < 3 ? this.formatTerminal() : '';
    this.terminalModel.split('\n').at(-1) === '' ? this.emitTerminal() : '';
    this.terminalModel.split('\n').at(-1) === '╰─$' ? this.emitTerminal() : '';
  }
}
