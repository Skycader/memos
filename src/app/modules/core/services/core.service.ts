import { Injectable } from '@angular/core';
import { DatabaseService } from '../../database/services/database.service';
import { MathService } from '../../math/services/math.service';
import { Dir } from '../models/dir.model';
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
  constructor(
    private math: MathService,
    private db: DatabaseService,
  ) {}

  /**
   * Create a directory in dedicated path
   * Specify icon, title and sample sides
   * @param icon
   * @param title
   * @param sides
   * @param path
   */
  public async mkdir(
    owner: string,
    icon: string,
    title: string,
    fields: string[],
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
    return await this.db.add.dir(id, owner, icon, title, fields);
  }

  /**
   * Add a card
   * @param content
   * @param ownedBy
   * @param nextRepeat
   * @param prevRepeat
   * @param spec
   */
  public async touch(contents: string[], owner: string) {
    /**
     * Assuming id constists of [A-Za-z] and [0-9], which makes 26*2+10 = 62 options for first symbol
     * and 62^2 for 2 length id (3844 both cards and dirs), and 62^3 makes over 238 000 possible cards,
     * let's just leave it 62^4 = over 14 millions of cards possible to keep and that's just 8 bytes.
     */

    /**
     * Memos philosophy goes like
     * It is highly unrecommended to
     * make cards in the root directory
     * Better put cards in the corresponding
     * directory
     * Root is only for folders!
     */
    if (owner === '/') return;

    /**
     * Creates a status matrix depending on amount of fields in contents
     * Two inner arrays for a simple card with 2 sides
     * Three inner arrays for a language card with 3 sides
     * 4+ if required
     * @returns
     */
    const makeArrays = () => contents.map((item: string) => []);
    const spec: CardSPEC = { status: makeArrays() };
    const id = this.math.makeId(4);
    await this.db.add.card(id, owner, contents, Date.now(), Date.now(), spec);
  }

  /**
   * List dirs by path
   * @param path
   * @returns
   */
  public async lsdir(dirId: string, page: number): Promise<Dir[]> {
    console.log('DIRID:', dirId);
    let rows: any = await this.db.get.dirByOwner(dirId);

    const dirs = [];

    rows = Array.from(rows);

    for (let row of rows) {
      let foundRows: any = await this.db.get.dirById(row.id);
      dirs.push({
        id: row.id,
        owner: row.owner,
        icon: row.icon,
        title: row.title,
        fields: row.fields,
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
    const cards = await this.db.get.cardsByOwner(owner, 10, 0);
    return cards;
  }

  public async removeDir(id: string) {
    return await this.db.remove.dirById(id);
  }

  /**
   * Drop database
   */
  public async drop() {
    await this.db.drop();
  }
}
