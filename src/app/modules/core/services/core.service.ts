import { Injectable } from '@angular/core';
import { DatabaseService } from '../../database/services/database.service';
import { MathService } from '../../math/services/math.service';
import { Card, Directory } from '../../database/services/db';
import { Removed } from '../../database/services/remove.service';
import { CardSPEC } from '../models/spec.model';

/** how many items one page of a listing holds */
export const PAGE_SIZE = 20;

/** one page of a directory listing */
export interface Listing {
  dirs: Directory[];
  cards: Card[];
  /** counted from 1 */
  page: number;
  pages: number;
}

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
   * One page of the cards of a directory
   * @param owner id of the directory
   * @param page counted from 0
   */
  public async ls(owner: string, page: number): Promise<Card[]> {
    return await this.db.get.cardsByOwner(owner, PAGE_SIZE, page * PAGE_SIZE);
  }

  /**
   * One page of what a directory holds: directories first (by title), then cards.
   * The two kinds are one list cut into pages of PAGE_SIZE, so a page may hold both
   * @param kinds what to list
   * @param page counted from 1
   * @throws Error if the page does not exist
   */
  public async list(
    owner: string,
    kinds: { dirs: boolean; cards: boolean },
    page: number
  ): Promise<Listing> {
    const dirs = kinds.dirs
      ? [...(await this.db.get.dirByOwner(owner))].sort((a, b) => a.title.localeCompare(b.title))
      : [];
    const cardCount = kinds.cards ? await this.db.get.countCardsByOwner(owner) : 0;

    const pages = Math.max(1, Math.ceil((dirs.length + cardCount) / PAGE_SIZE));
    if (page < 1 || page > pages)
      throw new Error(`There is no page ${page}: the listing has ${pages} page${pages === 1 ? '' : 's'}`);

    const from = (page - 1) * PAGE_SIZE;
    const dirsHere = dirs.slice(from, from + PAGE_SIZE);
    const room = PAGE_SIZE - dirsHere.length;
    const cards =
      kinds.cards && room > 0
        ? await this.db.get.cardsByOwner(owner, room, Math.max(0, from - dirs.length))
        : [];

    return { dirs: dirsHere, cards, page, pages };
  }

  /**
   * Ids of all the cards of a directory (for Tab completion)
   */
  public async cardIds(owner: string): Promise<string[]> {
    return await this.db.get.cardIdsByOwner(owner);
  }

  /**
   * Remove one card by id
   * @returns 1 if it was there, 0 if there is no such card
   */
  public async removeCard(id: string): Promise<number> {
    return await this.db.remove.cardById(id);
  }

  /**
   * Remove a directory with everything inside it
   * @returns how many directories (the one itself included) and cards went; 0 and 0 if there is no such directory
   */
  public async removeDir(id: string): Promise<Removed> {
    return await this.db.remove.dirById(id);
  }

  /**
   * Drop database
   */
  public async drop() {
    await this.db.drop();
  }
}
