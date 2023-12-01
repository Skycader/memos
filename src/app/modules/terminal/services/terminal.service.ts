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
  private path: string[] = ['/'];

  constructor(private core: CoreService) {}

  public getCDI(): string {
    let output = this.path.at(-1);
    if (output) return output;
    return '/';
  }
  public cd(id: string) {
    id === '..' ? this.path.pop() : this.path.push(id);
  }
  public pwd() {
    return this.path.join('/').replace('//', '/');
  }

  public async lsdir(current: string, page: number) {
    let dirs = await this.core.lsdir(this.getCDI(), page);
    return dirs
      .map(
        (dir: any) => ` · DIR ${dir.id} ${dir.icon} ${dir.title} [${dir.sides}]`
      )
      .join('\n');
  }

  public async ls(page: number) {
    let cards: any = await this.core.ls(this.getCDI(), page);

    console.log('CARDS: ', cards);
    return cards
      .map(
        (card: any) =>
          ` · CARD ${card.id} owned by ${card.owner} has sides ${
            card.content
          } next: ${card.next} prev: ${card.prev} SPEC: ${JSON.stringify(
            card.spec
          )}`
      )
      .join('\n');
  }
}
