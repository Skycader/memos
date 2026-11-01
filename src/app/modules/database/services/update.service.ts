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
   * Change the sides of a directory and of the cards in it together, in one transaction:
   * either all of it is written or none, so cards and their directory never disagree.
   * @param change gets the directory and its cards and returns the new names of the sides
   * and the cards that must be written (the others are left alone); throw to refuse
   * @returns the directory as it is now, undefined if there is no such directory
   */
  public async directoryWithCards(
    id: string,
    change: (dir: Directory, cards: Card[]) => { fields: string[]; cards: Card[] }
  ): Promise<Directory | undefined> {
    return await db.transaction('rw', db.directory, db.card, async () => {
      const dir = await db.directory.get(id as any);
      if (dir === undefined) return undefined;

      const cards = await db.card.where('owner').equals(id).toArray();
      const result = change(dir, cards);
      await db.directory.update(id as any, { fields: result.fields });
      if (result.cards.length > 0) await db.card.bulkPut(result.cards as any);
      return { ...dir, fields: result.fields };
    });
  }
}
