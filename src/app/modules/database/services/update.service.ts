import { Injectable } from '@angular/core';
import { Card, Directory } from './db';
import { db } from './db';

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  /**
   * Change the sides of one card. Reads and writes in one transaction,
   * so the card can not change between the check and the write.
   * Nothing else on the card is touched: id, owner, schedule and spec stay as they are
   * @param change gets a copy of the sides and returns the new ones; throw to refuse
   * @returns the card as it was before and as it is now, undefined if there is no such card
   */
  public async cardContents(
    id: string,
    change: (contents: string[]) => string[]
  ): Promise<{ before: Card; after: Card } | undefined> {
    return await db.transaction('rw', db.card, async () => {
      const before = await db.card.get(id as any);
      if (before === undefined) return undefined;

      const contents = change([...before.contents]);
      if (contents.length !== before.contents.length)
        throw new Error('The number of sides of a card can not change');
      await db.card.update(id as any, { contents });
      return { before, after: { ...before, contents } };
    });
  }

  /**
   * Put a directory into another one (or into the root, '/'). Only its `owner` changes: everything
   * inside points at the id of the directory, so it goes along and keeps its ids.
   * Checked and written in one transaction, so nothing can change in between
   * @param to id of the directory it goes into, '/' for the root
   * @throws Error if the directory or the target does not exist, it is already there, the target
   * is the directory itself or lies inside it, or the target already has a directory of that title
   * @returns the directory as it was before, undefined if there is no such directory
   */
  public async moveDirectory(id: string, to: string): Promise<Directory | undefined> {
    return await db.transaction('rw', db.directory, async () => {
      const dir = await db.directory.get(id as any);
      if (dir === undefined) return undefined;

      if (to !== '/' && (await db.directory.get(to as any)) === undefined)
        throw new Error(`There is no directory with the id ${to}`);
      if (dir.owner === to) throw new Error(`"${dir.title}" is already there`);

      /** walk up from the target to the root: meeting the directory itself means it is inside it */
      let above = to;
      for (let steps = 0; above !== '/' && steps < 100000; steps++) {
        if (above === id)
          throw new Error(`"${dir.title}" can not be moved into itself or into a directory inside it`);
        above = (await db.directory.get(above as any))?.owner ?? '/';
      }

      if ((await db.directory.where({ owner: to, title: dir.title }).first()) !== undefined)
        throw new Error(`There is already a directory "${dir.title}" there`);

      await db.directory.update(id as any, { owner: to });
      return dir;
    });
  }

  /**
   * Put a card into a directory. Only its `owner` changes: the id, the sides and the schedule stay
   * @param to id of a directory
   * @throws Error if the card or the directory does not exist or the card is already there
   * @returns the card and the directory it went into, undefined if there is no such card
   */
  public async moveCard(
    id: string,
    to: string
  ): Promise<{ card: Card; target: Directory } | undefined> {
    return await db.transaction('rw', db.directory, db.card, async () => {
      const card = await db.card.get(id as any);
      if (card === undefined) return undefined;

      const target = await db.directory.get(to as any);
      if (target === undefined) throw new Error(`There is no directory with the id ${to}`);
      if (card.owner === to) throw new Error(`The card ${id} is already there`);

      await db.card.update(id as any, { owner: to });
      return { card, target };
    });
  }

  /**
   * Change the sides of a directory and of the cards in it together, in one transaction:
   * either all of it is written or none, so cards and their directory never disagree.
   * @param change gets the directory and its cards and returns the new names of the sides
   * and the cards that must be written (the others are left alone); throw to refuse
   * @returns the directory as it is now, undefined if there is no such directory
   */
  public async directoryWithCards(
    id: string,
    change: (
      dir: Directory,
      cards: Card[]
    ) => { fields: string[]; cards: Card[]; icon?: string; title?: string }
  ): Promise<Directory | undefined> {
    return await db.transaction('rw', db.directory, db.card, async () => {
      const dir = await db.directory.get(id as any);
      if (dir === undefined) return undefined;

      const cards = await db.card.where('owner').equals(id).toArray();
      const result = change(dir, cards);
      /** the icon and the title are part of the same write: they are only set when given */
      const patch: Partial<Directory> = { fields: result.fields };
      if (result.icon !== undefined) patch.icon = result.icon;
      if (result.title !== undefined) patch.title = result.title;
      await db.directory.update(id as any, patch);
      if (result.cards.length > 0) await db.card.bulkPut(result.cards as any);
      return { ...dir, ...patch };
    });
  }
}
