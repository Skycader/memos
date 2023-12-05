import { Injectable } from '@angular/core';
import { Dir } from '../../core/models/dir.model';
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
  private dirsInPWD: Dir[] = [];
  constructor(private core: CoreService) {
    this.cacheDirsInPwd();
  }

  public async cacheDirsInPwd() {
    let dirs = await this.core.lsdir(this.getCDI(), 0);
    this.dirsInPWD = dirs;
  }

  public getCDI(): string {
    let output = this.path.at(-1);
    if (output) return output;
    return '/';
  }
  public cd(id: string) {
    id === '..' ? this.path.pop() : this.path.push(id);
  }
  public cdByName(name: string) {
    // const dirs = await this.core.lsdir(this.getCDI(), 0);
    const dirs: Dir[] = this.dirsInPWD;
    const getDirByTitle = (dirs: Dir[], title: string) =>
      dirs.find((dir: Dir) => dir.title === title);
    const processId = (dir: Dir | undefined) =>
      dir !== undefined ? dir : { id: '/' };
    name === '..'
      ? this.path.pop()
      : this.path.push(processId(getDirByTitle(dirs, name)).id);

    this.cacheDirsInPwd();
  }

  public pwd() {
    return this.path.join('/').replace('//', '/');
  }

  public async lsdir(page: number) {
    let dirs = await this.core.lsdir(this.getCDI(), page);
    this.dirsInPWD = dirs;
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
