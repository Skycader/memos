import { Injectable } from '@angular/core';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class GetService {
  constructor(private query: QueryService) {}

  async rowById(id: string) {
    return await this.query.run(`SELECT * FROM MEMOS WHERE ID = ?`, [id]);
  }
}
