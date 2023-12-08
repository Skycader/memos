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
  private path: Dir[] = [];
  private dirsInPWD: Dir[] = [];
  constructor(private core: CoreService) {
    this.cacheDirsInWd();
  }

  public async cacheDirsInWd() {
    let dirs = await this.core.lsdir(this.getCDI(), 0);
    this.dirsInPWD = dirs;
  }

  public getCDI(): string {
    let output = this.path.at(-1)?.id;
    if (output) return output;
    return '/';
  }

  public cd(name: string) {
    const dirs: Dir[] = this.dirsInPWD;

    const getDirByTitle = (dirs: Dir[], title: string) =>
      dirs.find((dir: Dir) => dir.title === title);

    const processId = (dir: Dir | undefined) =>
      dir !== undefined ? dir : null;

    const processedDir = processId(getDirByTitle(dirs, name));
    if (name === '..') {
      this.path.pop();
      return { status: 200 };
    }
    if (name === '/') {
      this.path = [];
      return { status: 200 };
    }
    if (processedDir !== null) this.path.push(processedDir);

    /**
     * Cache available dirs in the current path
     */
    this.cacheDirsInWd();

    /**
     * Do nothing if required dir to cd does not exist in wd
     */
    if (processedDir === null)
      return { status: 404, info: 'Directory does not exist' };
    return { status: 200 };
  }

  public pwd() {
    let path = '/';
    path += this.path.map((dir: any) => dir.title).join('/');

    path = path.replaceAll('//', '/');
    return { status: 200, data: path };
  }

  public async lsdir(page: number) {
    let dirs = await this.core.lsdir(this.getCDI(), page);
    console.log('DIRS: ', dirs);
    this.dirsInPWD = dirs;
    const output = dirs
      .map(
        (dir: any) => ` · DIR ${dir.id} ${dir.icon} ${dir.title} [${dir.sides}]`
      )
      .join('\n');

    return {
      status: 200,
      data: output,
    };
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

class Dir {
  public id = '/';
  public title: string = '';
  constructor(
    id: string,
    icon: string,
    title: string,
    owner: string,
    sides: string[]
  ) {
    this.id = id;
  }
}
