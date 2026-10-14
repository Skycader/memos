import { Component } from '@angular/core';
import { CoreService } from './modules/core/services/core.service';
import { ThemeService } from './modules/core/services/theme.service';
import { TerminalService } from './modules/terminal/services/terminal.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'memos 2.0';

  /**
   * ThemeService applies the saved color theme as soon as it is created
   */
  constructor(
    private core: CoreService,
    private terminal: TerminalService,
    private theme: ThemeService
  ) {}

  ngOnInit() {}
}
