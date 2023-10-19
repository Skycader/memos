import { Injectable } from '@angular/core';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class RowService {
  constructor(private query: QueryService) {}

  /**
   * Add row with an entity id, type, property and value
   */
  public async add(id: string, type: string, property: string, value: string) {
    await this.query.run(
      'INSERT INTO MEMOS (ID,TYPE,PROPERTY,VALUE) VALUES (?,?,?,?)',
      [id, type, property, value]
    );
  }

  public async removeById(id: string) {
    await this.query.run('DELETE FROM MEMOS WHERE ID = ?', [id]);
  }
}
