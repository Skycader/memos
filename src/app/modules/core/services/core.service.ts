import { Injectable } from '@angular/core';
import { DatabaseService } from '../../database/services/database.service';
import { MathService } from '../../math/services/math.service';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  /**
   * Core service
   * used for abstract operations over database such as:
   * · Add directory -> mkdir
   * · Add card -> touch
   */
  constructor(private math: MathService, private db: DatabaseService) {}

  /**
   * Create a directory in dedicated path
   * Specify icon, title and sample sides
   * @param icon
   * @param title
   * @param sides
   * @param path
   */
  public async mkdir(
    icon: string,
    title: string,
    sides: string[],
    path: string
  ) {
    const id = this.math.makeId(10);
    await this.db.add.row(id, 'DIR', 'ICON', (icon = '<ICON NOT SPECIFIED>'));
    await this.db.add.row(
      id,
      'DIR',
      'TITLE',
      (title = '<TITLE NOT SPECIFIED>')
    );
    await this.db.add.row(id, 'DIR', 'SIDES', JSON.stringify(sides));
    await this.db.add.row(id, 'DIR', 'PATH', (path = '/'));
  }

  /**
   * List dirs by path
   * @param path
   * @returns
   */
  public async lsdir(path: string) {
    return await this.db.find.row({
      type: 'DIR',
      property: 'PATH',
      value: path,
    });
  }

  /**
   * List cards by path
   * @param path
   * @returns
   */
  public async ls(path: string) {
    return await this.db.find.row({
      type: 'CARD',
      property: 'PATH',
      value: path,
    });
  }

  /**
   * Drop database
   */
  public async drop() {
    await this.db.drop();
  }
}
