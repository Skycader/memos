import { Injectable } from '@angular/core';
import { Row } from '../models/row.model';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class FindService {
  constructor(private query: QueryService) {}

  async row(row: Row) {
    row.id = row.id ? `%${row.id}%` : '%%';
    row.property = row.property ? `%${row.property}%` : '%%';
    row.value = row.value ? `%${row.value}%` : '%%';

    // return await this.query.run(
    //   'SELECT * FROM MEMOS WHERE ID LIKE ? AND PROPERTY LIKE ? AND VALUE LIKE ?',
    //   [row.id, row.property, row.value]
    // );
  }
}
