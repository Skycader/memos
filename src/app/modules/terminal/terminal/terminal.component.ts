import { Component } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { Command } from '../models/command.model';
import { TerminalService } from '../services/terminal.service';
import { helpMessage } from './messeges';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss'],
})
export class TerminalComponent {
  /**
   * A help message
   */
  public helpMessage = helpMessage;

  /**
   * ngModel that tracks value kept in terminal
   */
  public terminalModel: string = '';

  /**
   * A welcoming message
   * looks like
   * ╭─axl@memos /
   * ╰─$
   */
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

  /**
   * Type on terminal event
   * @param value
   */
  public type(value: string) {
    setTimeout(() => {
      this.middleware();
    });
  }

  /**
   * Output message to terminal
   * @param value
   */
  public output(value: string) {
    console.log('OUTPUTTING: ', value);
    setTimeout(() => {
      this.terminalModel += value;
    });
  }

  /**
   * A tuple of available commands, such as help and cd
   */
  public availableCommands: any = {
    help: () => this.helpMessage,
    cd: (args: any) => this.changeDirectory(args),
    mkdir: (args: any) => this.mkdir(args),
    lsdir: (args: any) => this.lsdir(args),
    '': () => '',
  };

  public async lsdir(args: any) {
    const path = args.at(0);
    let res: any = await this.terminal.lsdir(path);
    console.log('RES: ', res);
    this.terminalModel = this.terminalModel.replace('xxx', res);
    console.log('RES: ', res);
    // this.output(res);
    return 'GETTING ...';
  }

  /**
   * Run make directory sequence
   * @param args of dir icon, title, sides
   */
  public mkdir(args: any) {
    const icon = args.at(0);
    const title = args.at(1);
    const sides = args.split(' ').slice(2);
    this.core.mkdir(icon, title, sides, this.terminal.pwd());
  }
  /**
   * Change directory
   * @param path
   */
  public changeDirectory(path: string) {
    this.terminal.cd(path);
  }

  /**
   * Run terminal commands such as ls, mkdir, etc.
   * @param command
   * @returns
   */
  public runCommand(command: Command): string {
    const cmd = command.at(0);
    const args: any = command.split(' ').slice(1).join(' ');
    let result = this.availableCommands[cmd](args) || '';
    if (typeof result === 'object') return 'xxx';
    return '';
  }

  /**
   * Clear terminal command
   */
  public clearTerminal() {
    setTimeout(() => {
      this.terminalModel = this.terminalWelcomeMsg;
    });
  }

  /**
   * Should run on backspace clearing welcoming message
   */
  public formatTerminal() {
    this.terminalModel = this.terminalWelcomeMsg;
  }

  /**
   * Trigger event on Enter press preparing a command for runCommand method
   */
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
