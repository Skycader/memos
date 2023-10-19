import { Injectable } from '@angular/core';
import { ITX } from '../models/tx.model';

@Injectable({
  providedIn: 'root',
})
export class QueryService {
  /**
   * Database reference for all SQL operations
   */
  public db: any = null;

  constructor() {
    this.initDatabase();
  }

  /**
   * Database initialization sequence
   */
  private async initDatabase() {
    this.db = window.openDatabase('MEMODB', '2.0', 'MEMOS DATABASE', 0);
    await this.run(
      'CREATE TABLE IF NOT EXISTS MEMOS (ID, TYPE, PROPERTY, VALUE)',
      []
    );
  }

  /**
   * SQL query interface
   * @param query
   * @param values
   * @returns
   */
  public run(query: string, values: string[]) {
    return new Promise((resolve, reject) => {
      this.db.transaction(function (tx: ITX) {
        tx.executeSql(
          query,
          values,
          (tx: ITX, results: any) => resolve(results.rows),
          (tx: ITX, results: any) => console.warn(query, tx, results, 'ERROR')
        );
      });
    });
  }
}
