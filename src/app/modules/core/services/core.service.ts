import { Injectable } from '@angular/core';
import { DatabaseService } from '../../database/services/database.service';
import { MathService } from '../../math/services/math.service';
import { Directory } from '../../database/services/db';
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
     * A title has to be usable in a path: cd French/Verbs
     */
    if (title === '' || title === '.' || title === '..' || title.includes('/'))
      throw new Error(`Title "${title}" is not allowed: it can not be empty, . or .. or contain /`);

    /**
     * A title is unique within its directory: cd and rmdir find directories by it
     */
    if ((await this.db.get.dirByOwnerAndTitle(owner, title)) !== undefined)
      throw new Error(`Directory "${title}" already exists here`);

    /**
     * TABLE STRUCTURE
     */
    const id = await this.freeId('dir');
    return await this.db.add.dir(id, owner, icon, title, fields);
  }

  /**
   * Make an id that is not taken yet
   * (ids are random, so a collision is unlikely, but possible)
   * @param kind table to look the id up in
   */
  private async freeId(kind: 'dir' | 'card'): Promise<string> {
    for (let attempt = 0; attempt < 100; attempt++) {
      const id = this.math.makeId(4);
      const taken =
        kind === 'dir'
          ? await this.db.get.dirById(id)
          : await this.db.get.cardById(id);
      if (taken.length === 0) return id;
    }
    throw new Error(`Could not find a free ${kind} id`);
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
    const id = await this.freeId('card');
    await this.db.add.card(id, owner, contents, Date.now(), Date.now(), spec);
  }

  /**
   * List dirs by path
   * @param path
   * @returns
   */
  public async lsdir(dirId: string, page: number): Promise<Directory[]> {
    console.log('DIRID:', dirId);
    const rows = await this.db.get.dirByOwner(dirId);

    return rows.map((row) => ({
      id: row.id,
      owner: row.owner,
      icon: row.icon,
      title: row.title,
      fields: row.fields,
    }));
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
