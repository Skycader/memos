import { Injectable } from '@angular/core';
import { db } from './db';

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
