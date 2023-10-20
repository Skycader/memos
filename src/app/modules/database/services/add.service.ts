import { Injectable } from '@angular/core';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class AddService {
  constructor(private query: QueryService) {}

  /**
   * Add row with an entity id, type, property and value
   */
  public async row(id: string, property: string, value: string) {
    return await this.query.run(
      'INSERT INTO MEMOS (ID, PROPERTY,VALUE) VALUES (?,?,?)',
      [id, property, value]
    );
  }
}
