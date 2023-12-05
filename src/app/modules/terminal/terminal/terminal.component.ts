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
    cd: (args: string[]) => this.cdByName(args[0]),
    mkdir: (args: string[]) => this.mkdir(args),
    touch: (args: string[]) => this.touch(args),
    lsdir: (args: string) => this.lsdir(args),
    ls: (args: string[]) => this.ls(args),
    dir: (args: string) => this.lsdir(args),
    lsd: (args: string) => this.lsdir(args),
    drop: (args: string) => this.drop(args),
    clear: () => this.clearTerminal(),
    rmdir: (args: string) => this.rmdir(args),
    pwd: () => this.terminal.pwd(),
    '': () => '',
  };

  public async ls(args: string[]) {
    const CDI = this.terminal.getCDI();
    let res: any = await this.terminal.ls(0);
    console.log('RES: ', res);
    this.terminalModel = this.terminalModel.replace('⠀', res);
  }

  /**
   * List directories
   * @param args page: number (0,1...)
   */
  public async lsdir(args: string) {
    const path = this.terminal.pwd();
    const page: number = Number(args.at(0));
    let res: any = await this.terminal.lsdir(page);

    this.terminalModel = this.terminalModel.replace('⠀', res);
  }

  //#TODO: 3. УДАЛАЯ ДИРЕКТОРИЮ -- УДАЛЯТЬ ВСЕ ВНУТРЕННИИ ПАПКИ И ФАЙЛЫ
  /**
   * Remove directory
   * @param args
   */
  public async rmdir(args: string) {
    this.core.removeDir(args);
  }
  /**
   * Erase database
   * @param args
   */
  public async drop(args: string) {
    this.core.drop();
  }

  /**
   * Create file (card)
   * @param args
   * #TODO: switch command API to touch X21 Un chat, A cat
   */
  public touch(args: string[]) {
    const content = args.slice(0, -1);
    const owner = args.at(-1) || '';
    this.core.touch(content, owner);
  }

  public cdByName(name: string) {
    this.terminal.cdByName(name);
  }

  /**
   * Run make directory sequence
   * @param args of dir icon, title, sides
   */
  public mkdir(args: any) {
    const icon = args.at(0);
    const title = args.at(1);
    const sides = args.slice(2);
    this.core.mkdir(icon, title, sides, this.terminal.getCDI());
  }
  //#TODO: 1. ПРЕЖДЕ ЧЕМ ДЕЛАТЬ ПЕРЕХОД -- ПРОВЕРИТЬ СУЩЕСТВУЕТ ЛИ ТАКОЙ ПУТЬ
  /**
   * Change directory
   * @param path
   */
  public changeDirectory(id: string) {
    this.terminal.cd(id);
  }

  /**
   * Run terminal commands that are available in the list
   * @param command
   * @returns
   */
  public runCommand(command: Command): string {
    const cmd = command.at(0);
    /**
     * ARGS - arguments of the terminal command, for example: mkdir X French (X and French are arguments,
     * would be [X,French])
     */
    const args: any = command.split(' ').slice(1);
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
   * because: #TODO
   */
  public middleware() {
    this.terminalModel.length < 3 ? this.formatTerminal() : '';
    this.terminalModel.split('\n').at(-1) === '' ? this.emitTerminal() : '';
    this.terminalModel.split('\n').at(-1) === '╰─$'
      ? (this.terminalModel += ' ')
      : '';
  }
}
