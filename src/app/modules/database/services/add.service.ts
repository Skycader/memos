import { Injectable } from '@angular/core';
import { db } from './db';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class AddService {
  constructor(private query: QueryService) {}

  /**
   * Add row with an entity id, type, property and value
   */
  public async dir(
    id: string,
    owner: string,
    icon: string,
    title: string,
    fields: string[]
  ) {
    return await db.directory.add({
      id,
      owner,
      icon,
      title,
      fields,
    });
  }
}
