import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  /**
   * Database reference for all SQL operations
   */
  public db: any = null;
  public lastQuery: string = '';
  public queryResults: any = new Subject();
  constructor() {}

  /**
   *
   */
  public initDatabase() {
    this.db = window.openDatabase('MEMODB', '2.0', 'MEMOS DATABASE', 0);
    this.query('CREATE TABLE IF NOT EXISTS MEMOS (ID, TYPE, PROPERTY, VALUE)');
  }

  public query(query: string) {
    this.lastQuery = query;
    this.db.transaction(this.transaction.bind(this));
  }
  public transaction(tx: any) {
    tx.executeSql(
      this.lastQuery,
      [],
      this.sucessfulQuery.bind(this),
      this.failedQuery.bind(this)
    );
  }

  public sucessfulQuery(tx: any, results: any) {
    this.queryResults.next(results.rows);
  }

  public failedQuery(tx: any, results: any) {
    console.warn('ERROR', tx, results, this.lastQuery);
  }
}
