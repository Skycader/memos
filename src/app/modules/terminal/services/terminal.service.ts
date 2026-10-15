import { Injectable } from '@angular/core';
import { CoreService } from '../../core/services/core.service';
import { Directory as Dir } from '../../database/services/db';

@Injectable({
  providedIn: 'root',
})
export class TerminalService {
  /**
   * Terminal session: where the user currently is
   * Callable from the shell and from anything else, such as a GUI
   *
   * The path is a list of directories from the root down to the current one.
   * Nothing is cached: directories are looked up in the database when needed,
   * so the session never sees stale data
   */
  private path: Dir[] = [];

  constructor(private core: CoreService) {}

  public getPath(): Dir[] {
    return [...this.path];
  }

  public setPath(path: Dir[]) {
    this.path = [...path];
  }

  /**
   * Current Directory ID, '/' for the root
   */
  public getCDI(): string {
    return this.path.at(-1)?.id ?? '/';
  }

  public pwd(): string {
    return '/' + this.path.map((dir) => dir.title).join('/');
  }

  /**
   * Find where a path leads without going there
   * @param from directory to start from
   * @param target `French`, `..`, `/`, `French/Verbs`, `/French`, `../Spanish`; any name
   * in it can be the id of a directory instead (`4a3x`, `French/4a3x`)
   * @throws Error if some part of the path does not exist
   */
  public async resolve(from: Dir[], target: string): Promise<Dir[]> {
    const path = target.startsWith('/') ? [] : [...from];

    for (const segment of target.split('/')) {
      if (segment === '' || segment === '.') continue;
      if (segment === '..') {
        path.pop();
        continue;
      }
      const owner = path.at(-1)?.id ?? '/';
      const dirs = await this.core.lsdir(owner, 0);
      /** a directory is named by its title, or by its id as ls shows it; a title wins */
      const dir =
        dirs.find((item) => item.title === segment) ?? dirs.find((item) => item.id === segment);
      if (!dir) throw new Error(`Directory does not exist: ${segment}`);
      path.push(dir);
    }
    return path;
  }

  /**
   * Go to a directory, the path stays as it was if the target does not exist
   */
  public async cd(target: string) {
    this.path = await this.resolve(this.path, target);
  }

  /**
   * Step back out of directories that do not exist anymore,
   * for example after rmdir of the directory we are in
   */
  public async revalidate() {
    const kept: Dir[] = [];
    for (const dir of this.path) {
      const siblings = await this.core.lsdir(kept.at(-1)?.id ?? '/', 0);
      const found = siblings.find((item) => item.id === dir.id);
      if (!found) break;
      kept.push(found);
    }
    this.path = kept;
  }
}
