import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  /**
   * Low level API for CRUD Database operations
   * Type: WebSQL
   * Memos has only one flexible table: Memos table
   * Memos table has entities
   * Entity is a JavaScript object kept inside SQL database
   * with many rows notation
   * Here is the implementation by columns:
   * -- ID: for unification entity, however many rows can share one ID
   * -- TYPE: for differing entities types, such as a catalog and a card, or todo.
   * -- PROPERTY: KEY <-> VALUE link, for example repeatDate -> 01.01.2023 12:53 (in unix)
   * -- VALUE: number or string
   *
   * FULL EXAMPLE:
   * ID __ TYPE __ __ PROPERTY __ VALUE
   * X21 __ CARD __ __ CONTENT __ [PI, 3.14]
   * X21 __ CARD __ __ REPEATDATE __ 22.03.2001 00:00
   * X21 __ CARD __ __ LASTREPEAT __ 21.03.2001 01:23
   * X21 __ CARD __ __ STATUS __ __ __ [SPECIFICATION]
   * X21 __ CARD __ __ OWNEDBY __ F44
   * F44 __ CATALOG __ TITLE __ MATH
   * F44 __ CATALOG __ PATH __ /SCIENCES
   */

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

  /**
   * Add row with an entity id, type, property and value
   */
  public addRow(id: string, type: string, property: string, value: string) {}
}
