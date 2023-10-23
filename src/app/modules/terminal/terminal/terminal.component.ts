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
  public get terminalWelcomeMsg(): string {
    return '╭─axl@memos ' + this.terminal.pwd() + '\n╰─$ ';
  }

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
    cd: (args: string) => this.changeDirectory(args),
    mkdir: (args: string) => this.mkdir(args),
    lsdir: (args: string) => this.lsdir(args),
    dir: (args: string) => this.lsdir(args),
    lsd: (args: string) => this.lsdir(args),
    drop: (args: string) => this.drop(args),
    clear: () => this.clearTerminal(),
    rmdir: (args: string) => this.rmdir(args),
    pwd: () => this.terminal.pwd(),
    '': () => '',
  };

  /**
   * List directories
   * @param args
   */
  public async lsdir(args: string) {
    const path = this.terminal.pwd();
    const page: number = Number(args.at(0));
    let res: any = await this.terminal.lsdir(path, page);
    this.terminalModel = this.terminalModel.replace('⠀', res);
  }

  //#TODO: 3. УДАЛАЯ ДИРЕКТОРИЮ -- УДАЛЯТЬ ВСЕ ВНУТРЕННИИ ПАПКИ И ФАЙЛЫ
  /**
   * Remove directory
   * @param args
   */
  public async rmdir(args: string) {
    const path = this.terminal.pwd();
    const title = args;
    this.core.removeDir(path, title);
  }
  /**
   * Erase database
   * @param args
   */
  public async drop(args: string) {
    this.core.drop();
  }

  //TODO 2. PATH:TITLE ДОЛЖЕН БЫТЬ ИЗМЕНЕН НА OWNEDBY:TITLE (AX400:ENGLISH)
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
  //#TODO: 1. ПРЕЖДЕ ЧЕМ ДЕЛАТЬ ПЕРЕХОД -- ПРОВЕРИТЬ СУЩЕСТВУЕТ ЛИ ТАКОЙ ПУТЬ
  /**
   * Change directory
   * @param path
   */
  public changeDirectory(path: string) {
    console.log(path);
    this.terminal.cd(path);
  }

  /**
   * Run terminal commands that are available in the list
   * @param command
   * @returns
   */
  public runCommand(command: Command): string {
    const cmd = command.at(0);
    const args: any = command.split(' ').slice(1).join(' ');
    let result;
    this.availableCommands[cmd]
      ? (result = this.availableCommands[cmd](args) || '')
      : (result = 'Command not found');
    if (result === undefined) return '';
    if (typeof result === 'object') return '⠀';
    return result;
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
    this.terminalModel.split('\n').at(-1) === '╰─$'
      ? (this.terminalModel += ' ')
      : '';
  }
}
