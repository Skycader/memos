import { Injectable } from '@angular/core';
import { db } from './db';

@Injectable({
  providedIn: 'root',
})
export class RemoveService {
  /**
   * Remove a directory together with everything inside:
   * all nested directories and all cards, at any depth.
   * Runs in one transaction: either everything goes, or nothing does.
   * @returns amount of removed directories (0 if the directory does not exist)
   */
  public async dirById(id: string): Promise<number> {
    return await db.transaction('rw', db.directory, db.card, async () => {
      if ((await db.directory.get(id as any)) === undefined) return 0;

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
      await db.card.where('owner').anyOf(all).delete();
      await db.directory.bulkDelete(all as any);
      return all.length;
    });
  }
}
