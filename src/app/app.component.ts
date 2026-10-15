import { Component } from '@angular/core';
import { CoreService } from './modules/core/services/core.service';
import { FontService } from './modules/core/services/font.service';
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
   * ThemeService and FontService apply the saved choice as soon as they are created
   */
  constructor(
    private core: CoreService,
    private terminal: TerminalService,
    private theme: ThemeService,
    private font: FontService
  ) {}

  ngOnInit() {}
}
