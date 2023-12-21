import { Component } from '@angular/core';
import { CoreService } from './modules/core/services/core.service';
import { TerminalService } from './modules/terminal/services/terminal.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'memos 2.0';

  constructor(private core: CoreService, private terminal: TerminalService) {}

  ngOnInit() {}
}
