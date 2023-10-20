import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';

@Injectable({
  providedIn: 'root',
})
export class TerminalService {
  /**
   * Unix like terminal commands
   */
  private path = '/';
  private set currentPath(path: string) {
    this.path = path.replaceAll('//', '/');
    if (this.path === '') this.path = '/';
    if (this.path.slice(-1) === '/' && this.path.length > 1) {
      this.path = this.path.slice(0, -1);
    }
  }
  private get currentPath() {
    return this.path.replaceAll('//', '/');
  }
  constructor(private core: CoreService) {}

  /**
   * Change Directory
   */
  public cd(catalog: string) {
    if (catalog === '..') {
      this.currentPath = this.currentPath.split('/').slice(0, -1).join('/');
      return this.currentPath;
    }

    this.currentPath += `/${catalog}`;
    return this.currentPath;
  }

  public pwd() {
    return this.currentPath;
  }

  public async lsdir(path: string, page: number) {
    return await this.core.lsdir(path, page);
  }
}
