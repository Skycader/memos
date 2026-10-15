import { Injectable } from '@angular/core';
import { db } from './db';

/** what a removal of a directory took with it */
export interface Removed {
  /** directories gone, the one asked for included */
  dirs: number;
  /** cards gone, from all of those directories */
  cards: number;
}

@Injectable({
  providedIn: 'root',
})
export class RemoveService {
  /**
   * Remove one card
   * @returns 1 if there was such a card, 0 if not
   */
  public async cardById(id: string): Promise<number> {
    return await db.card.where({ id }).delete();
  }

  /**
   * Remove a directory together with everything inside:
   * all nested directories and all cards, at any depth.
   * Runs in one transaction: either everything goes, or nothing does.
   * @returns how much went: directories (the one asked for plus everything nested in it)
   * and cards (in all of them); both 0 if the directory does not exist
   */
  public async dirById(id: string): Promise<Removed> {
    return await db.transaction('rw', db.directory, db.card, async () => {
      if ((await db.directory.get(id as any)) === undefined) return { dirs: 0, cards: 0 };

      /**
       * Walk down by owner links, level by level
       */
      const ids = new Set<string>([id]);
      let level = [id];
      while (level.length > 0) {
        const children = await db.directory
          .where('owner')
          .anyOf(level)
          .toArray();
        level = children.map((dir) => dir.id).filter((child) => !ids.has(child));
        level.forEach((child) => ids.add(child));
      }

      const all = [...ids];
      const cards = await db.card.where('owner').anyOf(all).delete();
      await db.directory.bulkDelete(all as any);
      return { dirs: all.length, cards };
    });
  }
}
