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

  async cardsByOwner(owner: string, limit: number, offset: number) {
    return await db.card
      .where({
        owner: owner,
      })
      .limit(limit)
      .offset(offset)
      .toArray();
  }
}
