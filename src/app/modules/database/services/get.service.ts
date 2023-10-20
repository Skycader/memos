import { Injectable } from '@angular/core';
import { Row } from '../models/row.model';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class GetService {
  constructor(private query: QueryService) {}

  async rowById(id: string) {
    return await this.query.run(`SELECT * FROM MEMOS WHERE ID = ?`, [id]);
  }

  async rowByPath(path: string) {
    return await this.query.run(`SELECT * FROM MEMOS WHERE PATH = ?`, [path]);
  }

  /**
   * Get row by exact match
   * @param row
   * @returns
   */
  async row(row: Row) {
    row.id = row.id ? `${row.id}` : '%%';
    row.type = row.type ? `${row.type}` : '%%';
    row.property = row.property ? `${row.property}` : '%%';
    row.value = row.value ? `${row.value}` : '%%';

    return await this.query.run(
      'SELECT * FROM MEMOS WHERE ID LIKE ? AND TYPE LIKE ? AND PROPERTY LIKE ? AND VALUE LIKE ?',
      [row.id, row.type, row.property, row.value]
    );
  }
}
