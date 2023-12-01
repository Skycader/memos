import { Injectable } from '@angular/core';
import { DatabaseService } from '../../database/services/database.service';
import { MathService } from '../../math/services/math.service';
import { Dir } from '../models/dir.model';

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
    owner: string
  ) {
    /**
     * Assuming id constists of [A-Za-z] and [0-9], which makes 26*2+10 = 62 options for first symbol
     * and 62^2 for 2 length id (3844 both cards and dirs), and 62^3 makes over 238 000 possible cards,
     * let's just leave it 62^4 = over 14 millions of cards possible to keep and that's just 8 bytes.
     */

    /**
     * TABLE STRUCTURE
     */
    const id = this.math.makeId(4);
    await this.db.add.row(id, 'ICON', icon || '<ICON NOT SPECIFIED>');
    await this.db.add.row(id, 'TYPE', 'DIR');
    await this.db.add.row(id, 'OWNER:TITLE', `${owner}:${title}`);
    await this.db.add.row(id, 'SIDES', JSON.stringify(sides));
  }

  /**
   * Add a card
   * @param content
   * @param ownedBy
   * @param nextRepeat
   * @param prevRepeat
   * @param spec
   */
  public async touch(content: string[], owner: string) {
    /**
     * Assuming id constists of [A-Za-z] and [0-9], which makes 26*2+10 = 62 options for first symbol
     * and 62^2 for 2 length id (3844 both cards and dirs), and 62^3 makes over 238 000 possible cards,
     * let's just leave it 62^4 = over 14 millions of cards possible to keep and that's just 8 bytes.
     */

    const cardSpec: any = [];
    const id = this.math.makeId(4);
    await this.db.add.row(id, 'CONTENT', JSON.stringify(content));
    await this.db.add.row(id, 'COWNER', owner);
    await this.db.add.row(id, 'NEXTREPEAT', Date.now().toString());
    await this.db.add.row(id, 'LASTREPEAT', Date.now().toString());
    await this.db.add.row(id, 'SPEC', JSON.stringify(cardSpec));
  }

  /**
   * List dirs by path
   * @param path
   * @returns
   */
  public async lsdir(dirId: string, page: number): Promise<Dir[]> {
    let rows: any = await this.db.get.rows({
      property: 'OWNER:TITLE',
      value: `${dirId}:%`,
      limit: 10,
      skip: page * 10,
    });

    const dirs = [];

    rows = Array.from(rows);

    for (let row of rows) {
      /**
       *  0 ICON,
       *  1 TYPE,
       *  2 OWNER:TITLE,
       *  3 SIDES
       */
      let foundRows: any = await this.db.get.rowById(row.ID);
      console.log('FOUND: ', foundRows);
      dirs.push({
        id: row.ID,
        icon: foundRows[0].VALUE,
        title: foundRows[2].VALUE.split(':')[1],
        sides: JSON.parse(foundRows[3].VALUE),
        owner: foundRows[2].VALUE.split(':')[0],
      });
    }

    return dirs;
  }

  /**
   * List cards by owner dir
   * @param owner:string
   * @returns
   */
  public async ls(owner: string, page: number) {
    let rows: any = await this.db.find.row({
      property: 'COWNER',
      value: owner,
    });

    const cards = [];

    rows = Array.from(rows);

    for (let row of rows) {
      let foundRows: any = await this.db.get.rowById(row.ID);
      console.log('FOUND: ', foundRows);
      cards.push({
        id: row.ID,
        content: foundRows[0].VALUE,
        owner: foundRows[1].VALUE,
        next: foundRows[2].VALUE,
        prev: foundRows[3].VALUE,
        spec: foundRows[4].VALUE,
      });
    }

    return cards;
  }

  public async removeDir(id: string) {
    return await this.db.remove.rowById(id);
  }

  /**
   * Drop database
   */
  public async drop() {
    await this.db.drop();
  }
}
