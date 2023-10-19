import { Injectable } from '@angular/core';

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
  }
  private get currentPath() {
    return this.path.replaceAll('//', '/');
  }
  constructor() {}

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
}