import { Component } from '@angular/core';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss'],
})
export class TerminalComponent {
  public terminal: string = '$ ';

  constructor() {}

  public type(value: string) {
    this.middleware();
  }

  public output(value: string) {
    setTimeout(() => {
      this.terminal = value;
    });
  }

  public command(command: string) {
    console.log(command === 'help');
    switch (command) {
      case 'help':
        console.log('GOT HELP');
        setTimeout(() => {
          this.output('HELP');
        });
        break;
      default:
        console.log('default');
    }
  }

  public middleware() {
    if (this.terminal.length < 2) {
      setTimeout(() => {
        this.terminal = '$ ';
      });
    }
    if (this.terminal.includes('\n')) {
      setTimeout(() => {
        this.command(
          this.terminal.replace('$ ', '').replaceAll(' ', '').replace('\n', '')
        );
        this.terminal = '$ ';
      });
    }
  }
}
