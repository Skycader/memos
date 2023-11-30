import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';

@Injectable({
  providedIn: 'root',
})
export class TerminalService {
  /**
   * Unix like terminal commands interface API
   * Callable from components (both terminal.component.ts and any other, such as GUI)
   */

  /**
   * Current Directory ID
   */
  private CDI: string = '/';

  constructor(private core: CoreService) {}

  public cd() {}
  public pwd() {
    return '/';
  }

  public async lsdir(current: string, page: number) {
    let dirs = await this.core.lsdir(this.CDI, page);
    return dirs
      .map((dir: any) => ` · DIR ${dir.icon} ${dir.title} [${dir.sides}]`)
      .join('\n');
  }
}
