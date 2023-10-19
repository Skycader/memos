import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TerminalComponent } from './terminal/terminal.component';

@NgModule({
  declarations: [TerminalComponent],
  imports: [CommonModule, FormsModule],
  exports: [TerminalComponent],
})
export class TerminalModule {}
