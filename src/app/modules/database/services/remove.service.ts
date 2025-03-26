import { Injectable } from '@angular/core';
import { db } from './db';

@Injectable({
  providedIn: 'root',
})
export class RemoveService {
  constructor() {}

  public async dirById(id: string) {
    return await db.directory
      .where({
        id,
      })
      .delete();
  }
}
