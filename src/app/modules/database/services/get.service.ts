import { Injectable } from '@angular/core';
import { db } from './db';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class GetService {
  constructor(private query: QueryService) {}

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
