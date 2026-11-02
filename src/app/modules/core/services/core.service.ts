import { Injectable } from '@angular/core';
import { DatabaseService } from '../../database/services/database.service';
import { MathService } from '../../math/services/math.service';
import { Card, Directory } from '../../database/services/db';
import { Removed } from '../../database/services/remove.service';
import { applyPlanToCard, DirChange, DirPlan, planDirectoryEdit } from '../models/directory-edit';
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

    await this.checkTitle(owner, title);

    /**
     * TABLE STRUCTURE
     */
    const id = await this.freeId('dir');
    return await this.db.add.dir(id, owner, icon, title, fields);
  }

  /**
   * A title has to be usable in a path (cd French/Verbs) and unique within its directory,
   * because cd, rmdir and mv find directories by it
   * @throws Error if it is not
   */
  private async checkTitle(owner: string, title: string) {
    if (title === '' || title === '.' || title === '..' || title.includes('/'))
      throw new Error(`Title "${title}" is not allowed: it can not be empty, . or .. or contain /`);
    if ((await this.db.get.dirByOwnerAndTitle(owner, title)) !== undefined)
      throw new Error(`Directory "${title}" already exists here`);
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
   * @param questionOnly positions (from 0) of the sides that are only shown when studying and
   * never typed in: pictures, sounds, long texts with a gap to fill. Kept on the card as spec.qfields
   */
  public async touch(contents: string[], owner: string, questionOnly: number[] = []) {
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
    if (questionOnly.some((side) => !Number.isInteger(side) || side < 0 || side >= contents.length))
      throw new Error('A question only side must be one of the sides of the card');
    if (contents.length > 0 && new Set(questionOnly).size >= contents.length)
      throw new Error('Every side is question only: at least one side must be left to answer');

    const now = Date.now();
    const spec: CardSPEC = { status: makeArrays(), born: now };
    /** only cards that have such a side carry the field: the others stay as they were */
    if (questionOnly.length > 0) spec.qfields = [...new Set(questionOnly)].sort((a, b) => a - b);
    const id = await this.freeId('card');
    await this.db.add.card(id, owner, contents, now, now, spec);
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
   * Change sides of a card. The sides are an array, so a side is named by its place,
   * counted from 1 as people count. The number of sides stays the same, and so do the
   * id, the owner, the schedule and the marks of question only sides
   * @param changes place (from 1) and the new value of each side to change
   * @returns the sides as they were and as they are now
   * @throws Error if there is no such card, there is nothing to change, or a place is past the last side
   */
  public async editCard(
    id: string,
    changes: { position: number; value: string }[]
  ): Promise<{ before: string[]; after: string[] }> {
    if (changes.length === 0) throw new Error('There is nothing to change');

    const result = await this.db.update.cardContents(id, (contents) => {
      for (const { position, value } of changes) {
        if (position < 1 || position > contents.length)
          throw new Error(
            `The card has ${contents.length} side${contents.length === 1 ? '' : 's'}: ` +
              `there is no side ${position}`
          );
        contents[position - 1] = value;
      }
      return contents;
    });
    if (result === undefined) throw new Error(`There is no card with the id ${id}`);
    return { before: result.before.contents, after: result.after.contents };
  }

  /**
   * What an id names: ids are drawn for cards and for directories separately,
   * so one id can belong to both. The one in the given directory wins then
   * @param here the directory the user is in
   * @throws Error if the id fits a card and a directory and neither lies in `here`
   */
  public async whatIs(id: string, here: string): Promise<'card' | 'dir' | undefined> {
    const card = (await this.db.get.cardById(id))[0];
    const dir = (await this.db.get.dirById(id))[0];
    if (card && dir) {
      if (card.owner === here && dir.owner !== here) return 'card';
      if (dir.owner === here && card.owner !== here) return 'dir';
      throw new Error(`The id ${id} is both a card and a directory: cd next to the one you mean`);
    }
    return card ? 'card' : dir ? 'dir' : undefined;
  }

  /**
   * Move a directory, with everything inside it, into another one. The ids do not change
   * @param to id of the target directory, '/' for the root
   * @throws Error if it can not be done (see UpdateService.moveDirectory); nothing changes then
   */
  public async moveDir(id: string, to: string): Promise<void> {
    const before = await this.db.update.moveDirectory(id, to);
    if (before === undefined) throw new Error(`There is no directory with the id ${id}`);
  }

  /**
   * Move a card into a directory. The id and the progress do not change
   * @param to id of the target directory; the root is refused: cards live in directories
   * @returns the directory the card went into and how many sides the card has, to check that they fit
   * @throws Error if it can not be done; nothing changes then
   */
  public async moveCard(id: string, to: string): Promise<{ target: Directory; sides: number }> {
    if (to === '/')
      throw new Error('Cards can not be moved to the root (/): cards live in directories');
    const moved = await this.db.update.moveCard(id, to);
    if (moved === undefined) throw new Error(`There is no card with the id ${id}`);
    return { target: moved.target, sides: moved.card.contents.length };
  }

  /**
   * Every card in a directory and in the directories below it, at any depth, each with the
   * directory it lies in. '/' means the whole database
   */
  public async cardsUnder(owner: string): Promise<{ card: Card; dir: Directory }[]> {
    return await this.db.get.cardsUnder(owner);
  }

  /**
   * One card by id, undefined if there is none
   */
  public async card(id: string): Promise<Card | undefined> {
    return (await this.db.get.cardById(id))[0];
  }

  /**
   * Write a new schedule of a card: only `next` and `prev` change (a moment that is not given
   * stays), nothing else on the card
   * @throws Error if there is no such card
   */
  public async reschedule(id: string, schedule: { next?: number; prev?: number }): Promise<Card> {
    const card = await this.db.update.cardSchedule(id, schedule);
    if (card === undefined) throw new Error(`There is no card with the id ${id}`);
    return card;
  }

  /**
   * Whether the id is a directory, and which one
   */
  public async dir(id: string): Promise<Directory | undefined> {
    return (await this.db.get.dirById(id))[0];
  }

  /**
   * The path of a directory from the root, as pwd prints it: `/French/Verbs`; `/` for the root
   */
  public async pathOf(id: string): Promise<string> {
    const titles: string[] = [];
    for (let at = id, steps = 0; at !== '/' && steps < 100000; steps++) {
      const dir = (await this.db.get.dirById(at))[0];
      if (!dir) break;
      titles.unshift(dir.title);
      at = dir.owner;
    }
    return '/' + titles.join('/');
  }

  /**
   * See what a change of the sides of a directory would do, without doing it
   * @param changes place (from 1) and the new name of each side, or `empty` / `drop` to take it out
   * @throws Error if there is no such directory or the change is not allowed
   */
  public async planDirectory(id: string, changes: DirChange[]): Promise<DirPlan> {
    const dir = (await this.db.get.dirById(id))[0];
    if (!dir) throw new Error(`There is no directory with the id ${id}`);
    return planDirectoryEdit(dir.fields, await this.db.get.allCardsByOwner(id), changes);
  }

  /**
   * Change the sides of a directory and, in step with it, the sides of all its cards:
   * a side added gives every card an empty value, a side taken out is taken out of every card.
   * The check is made again inside the transaction, on the data as it is at that moment,
   * and everything is written together or not at all
   * @returns what was done
   */
  public async editDirectory(
    id: string,
    changes: DirChange[],
    meta: { icon?: string; name?: string } = {}
  ): Promise<DirPlan> {
    /** the new title is checked before anything is written, like the sides are */
    const current = (await this.db.get.dirById(id))[0];
    if (current && meta.name !== undefined && meta.name !== current.title)
      await this.checkTitle(current.owner, meta.name);

    let plan: DirPlan | undefined;
    const dir = await this.db.update.directoryWithCards(id, (now, cards) => {
      plan = planDirectoryEdit(now.fields, cards, changes);
      const done = plan;
      const changed = cards
        .map((card) => ({ card, next: applyPlanToCard(card, done) }))
        .filter(({ card, next }) => next !== card)
        .map(({ next }) => next);
      return { fields: done.fields, cards: changed, icon: meta.icon, title: meta.name };
    });
    if (dir === undefined || plan === undefined)
      throw new Error(`There is no directory with the id ${id}`);
    return plan;
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
