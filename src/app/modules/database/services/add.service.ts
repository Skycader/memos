import { Injectable } from '@angular/core';
import { CardSPEC } from '../../core/models/spec.model';
import { db } from './db';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class AddService {
  constructor(private query: QueryService) {}

  /**
   * Add directory
   */
  public async dir(
    id: string,
    owner: string,
    icon: string,
    title: string,
    fields: string[],
  ) {
    return await db.directory.add({
      id,
      owner,
      icon,
      title,
      fields,
    });
  }

  /**
   * Add card
   */
  public async card(
    id: string,
    owner: string,
    contents: string[],
    next: number,
    prev: number,
    spec: CardSPEC,
  ) {
    return await db.card.add({
      id,
      owner,
      contents,
      next,
      prev,
      spec,
    });
  }
}
