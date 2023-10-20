import { Injectable } from '@angular/core';
import { DatabaseService } from '../../database/services/database.service';
import { MathService } from '../../math/services/math.service';
import { CardSPEC } from '../models/spec.model';

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
    await this.db.add.row(id, 'DIR', 'ICON', icon || '<ICON NOT SPECIFIED>');
    await this.db.add.row(id, 'DIR', 'TITLE', title || '<TITLE NOT SPECIFIED>');
    await this.db.add.row(id, 'DIR', 'SIDES', JSON.stringify(sides));
    await this.db.add.row(id, 'DIR', 'PATH', path || '/');
  }

  public async touch(
    content: string[],
    ownedBy: string,
    nextRepeat: number,
    prevRepeat: number,
    spec: CardSPEC
  ) {
    const id = this.math.makeId(10);
    await this.db.add.row(id, 'CARD', 'CONTENT', JSON.stringify(content));
    await this.db.add.row(id, 'CARD', 'OWNEDBY', ownedBy);
    await this.db.add.row(id, 'CARD', 'NEXTREPEAT', nextRepeat.toString());
    await this.db.add.row(id, 'CARD', 'LASTREPEAT', prevRepeat.toString());
    await this.db.add.row(id, 'CARD', 'SPEC', JSON.stringify(spec));
  }

  /**
   * List dirs by path
   * @param path
   * @returns
   */
  public async lsdir(path: string) {
    let gotRow: any = await this.db.get.row({
      type: 'DIR',
      property: 'PATH',
      value: path,
    });

    let rows: any = await this.db.get.rowById(gotRow[0].ID);
    return rows[1].VALUE;
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
