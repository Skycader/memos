import { Injectable } from '@angular/core';
import { QueryService } from './query.service';

@Injectable({
  providedIn: 'root',
})
export class RemoveService {
  constructor(private query: QueryService) {}

  public async rowById(id: string) {
    return await this.query.run('DELETE FROM MEMOS WHERE ID = ?', [id]);
  }
}
