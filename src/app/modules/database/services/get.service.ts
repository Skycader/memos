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

  async rowPropertyValueById(args: any) {
    const id = args.id;
    const property = args.property;
    return await this.query.run(
      `SELECT VALUE FROM MEMOS WHERE ID = ? AND PROPERTY = ?`,
      [id, property]
    );
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
      'SELECT * FROM MEMOS WHERE ID LIKE ? AND TYPE LIKE ? AND PROPERTY LIKE ? AND VALUE LIKE ? LIMIT 1',
      [row.id, row.type, row.property, row.value]
    );
  }

  async rows(row: Row) {
    console.log(row);
    row.id = row.id ? `${row.id}` : '%%';
    row.type = row.type ? `${row.type}` : '%%';
    row.property = row.property ? `${row.property}` : '%%';
    row.value = row.value ? `${row.value}` : '%%';
    row.limit = row.limit ? row.limit : 1;
    row.skip = row.skip ? row.skip : 0;

    return await this.query.run(
      'SELECT * FROM MEMOS WHERE ID LIKE ? AND TYPE LIKE ? AND PROPERTY LIKE ? AND VALUE LIKE ? LIMIT ?,?',
      [
        row.id,
        row.type,
        row.property,
        row.value,
        row.skip.toString(),
        row.limit.toString(),
      ]
    );
  }
}
