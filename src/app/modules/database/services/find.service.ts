import { Injectable } from '@angular/core';
import { QueryService } from './query.service';

import { Card, db } from './db';
@Injectable({
  providedIn: 'root',
})
export class FindService {
  constructor(private query: QueryService) {}

  /**
   * Methods required:
   * @param row
   */

  async card(str: string) {
    return await db.card
      .filter((card: Card) => {
        return /cat/.test(card.contents[0]);
      })
      .toArray();
  }
}
