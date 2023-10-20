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
  public async lsdir(path: string, page: number) {
    let rows: any = await this.db.get.rows({
      type: 'DIR',
      property: 'PATH',
      value: path,
      limit: 10,
      skip: page * 10,
    });

    const dirs = [];

    rows = Array.from(rows);

    console.log('ROWS: ', rows);
    for (let row of rows) {
      let foundRows: any = await this.db.get.rowPropertyValueById({
        id: row.ID,
        property: 'TITLE',
      });
      dirs.push(foundRows[0].VALUE);
    }

    return dirs.map((dir: any) => ` · DIR ${dir}`).join('\n');
  }

  public async lsdirASC(path: string, page: number) {
    return await this.db.query.run(
      `SELECT VALUE FROM MEMOS WHERE ID IN (SELECT ID FROM MEMOS WHERE PROPERTY = "PATH" AND VALUE = ? LIMIT ?,?) AND PROPERTY = "TITLE" ORDER BY VALUE`,
      [path, (page * 10).toString(), '10']
    );
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
