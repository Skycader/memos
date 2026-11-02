import { Injectable } from '@angular/core';
import { Card, db, Directory } from './db';

@Injectable({
  providedIn: 'root',
})
export class GetService {
  async dirByOwner(owner: string) {
    console.log('ownerID:', owner, typeof owner, owner.length);
    return await db.directory
      .where({
        owner: owner,
      })
      .toArray();
  }

  async dirById(id: string) {
    console.log('DEBUG: ', 'GETTING DIR BY ID', id);
    return await db.directory
      .where({
        id,
      })
      .toArray();
  }

  async cardById(id: string) {
    return await db.card
      .where({
        id,
      })
      .toArray();
  }

  /**
   * A directory with the given title inside the given owner, if any
   */
  async dirByOwnerAndTitle(owner: string, title: string) {
    return await db.directory.where({ owner, title }).first();
  }

  /** ids of all the cards of a directory */
  async cardIdsByOwner(owner: string): Promise<string[]> {
    return (await db.card.where({ owner }).primaryKeys()) as unknown as string[];
  }

  /** all the cards of a directory */
  async allCardsByOwner(owner: string) {
    return await db.card.where({ owner }).toArray();
  }

  /**
   * Every card in a directory and in the directories below it, each with the directory it lies in.
   * '/' means everything. A directory is visited once, so a damaged tree can not loop
   */
  async cardsUnder(owner: string) {
    const found: { card: Card; dir: Directory }[] = [];
    const seen = new Set<string>();

    /** the directories of one level; the root has no row of its own, its children are the first level */
    let level: Directory[];
    if (owner === '/') level = await db.directory.where({ owner: '/' }).toArray();
    else {
      const top = await db.directory.get(owner as any);
      level = top ? [top] : [];
    }

    while (level.length > 0) {
      level = level.filter((dir) => !seen.has(dir.id));
      for (const dir of level) {
        seen.add(dir.id);
        for (const card of await db.card.where({ owner: dir.id }).toArray()) found.push({ card, dir });
      }
      level =
        level.length === 0
          ? []
          : await db.directory.where('owner').anyOf(level.map((dir) => dir.id)).toArray();
    }
    return found;
  }

  async countCardsByOwner(owner: string) {
    return await db.card.where({ owner }).count();
  }

  async cardsByOwner(owner: string, limit: number, offset: number) {
    return await db.card
      .where({
        owner: owner,
      })
      /** skip first, then take: Dexie applies limit().offset() the other way round */
      .offset(offset)
      .limit(limit)
      .toArray();
  }
}
