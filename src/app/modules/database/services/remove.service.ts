import { Injectable } from '@angular/core';
import { db } from './db';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class RemoveService {
  constructor(private query: QueryService) {}

  public async dirById(id: string) {
    return await db.directory
      .where({
        id,
      })
      .delete();
  }
}
