import { Injectable } from '@angular/core';
import { Row } from '../models/row.model';
import { db } from './db';

@Injectable({
  providedIn: 'root',
})
export class FindService {
  constructor() {}

  /**
   * Methods required:
   * @param row
   */

  async cardByContent(content: string) {
    const result = await db.card.filter(card => card.contents.join(" ").includes(content))
    .toArray()
    console.log(result);
    return result;
  }
}
