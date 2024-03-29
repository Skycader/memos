import { Component, ElementRef, ViewChild } from '@angular/core';
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
  public helpMessage = {
    status: 200,
    data: helpMessage,
  };

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
    return '╭─axl@memos ' + this.terminal.pwd().data + '\n╰─$ ';
  }

  @ViewChild('terminalRef') terminalRef!: ElementRef;

  constructor(private terminal: TerminalService, private core: CoreService) {}

  public ngAfterViewInit() {
    this.clearTerminal();
    console.log(this.terminalRef);
    let element: any = this.terminalRef;
    element.nativeElement.addEventListener('click', () => {
      element.nativeElement.focus();
      element.nativeElement.setSelectionRange(
        element.nativeElement.value.length,
        element.nativeElement.value.length
      );
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
    cd: (args: string[]) => this.cd(args[0]),
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
    '': () => {
      return {
        status: 200,
        data: '',
      };
    },
  };

  public async ls(args: string[]) {
    let res: any = await this.terminal.ls(0);
    console.log('RES: ', res);
    this.terminalModel = this.terminalModel.replace('⠀', res);
  }

  /**
   * List directories
   * @param args page: number (0,1...)
   */
  public async lsdir(args: string) {
    const page: number = Number(args.at(0));
    let res: any = await this.terminal.lsdir(page);
    console.log('RES: ', res);
    this.terminalModel = this.terminalModel.replace('⠀', res.data);
    return { status: 'pending' };
  }

  //#TODO: 3. УДАЛАЯ ДИРЕКТОРИЮ -- УДАЛЯТЬ ВСЕ ВНУТРЕННИИ ФАЙЛЫ
  // если есть папки - отмена
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
   * #TODO: сделай так, чтобы из терминала можно было создавать карточки с пробелами
   */
  public touch(args: string[]) {
    console.log('ARGS', args);
    const content = args;
    const owner = this.terminal.getCDI();
    this.core.touch(content, owner);
    return { status: 200 };
  }

  /**
   * Run make directory sequence
   * @param args of dir icon, title, sides
   */
  public mkdir(args: any) {
    const icon = args.at(0);
    const title = args.at(1);
    const sides = args.slice(2);
    this.core.mkdir(this.terminal.getCDI(), icon, title, sides);
    return { status: 200 };
  }
  /**
   * Change directory
   * Check if dir exists: ✅
   * @param path
   */
  public cd(id: string) {
    const status = this.terminal.cd(id);
    return status;
  }

  /**
   * Run terminal commands that are available in the list
   * @param command
   * @returns
   */
  public runCommand(command: Command): string {
    const cmd = command.split(' ').at(0);
    /**
     * ARGS - arguments of the terminal command, for example: mkdir X French (X and French are arguments,
     * would be [X,French])
     */
    const args: any = command.split(' ').slice(1);
    let result;

    console.log(cmd, args);
    this.availableCommands[cmd]
      ? (result = this.availableCommands[cmd](args))
      : (result = { status: 400, info: 'Command not found' });

    if (result.hasOwnProperty('status') && result.status !== 200)
      return '(!) ' + result.info;

    /** Async detected */
    if (typeof result === 'object' && !result.hasOwnProperty('status'))
      return '⠀';

    if (result.status === 200) return result.data ? result.data : '';
    return '(!) There has been unexpected error';
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
   * to format the content of terminal in case
   * of deleting importent content such as pwd
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
