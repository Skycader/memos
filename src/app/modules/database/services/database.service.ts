import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ITX } from '../models/tx.model';

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
   * -- (ENTITY) ID: for unification entity, however many rows can share one ID
   * -- (ENTITY) TYPE: for differing entities types, such as a catalog and a card, or todo.
   * -- (ENTITY) PROPERTY: KEY <-> VALUE link, for example repeatDate -> 01.01.2023 12:53 (in unix)
   * -- (ENTITY) VALUE: number or string
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
  public lastValues: string[] = [];
  public resolve: any = null;
  public queryResults: any = new Subject();
  constructor() {
    this.initDatabase();
  }

  /**
   * Database initialization sequence
   */
  private async initDatabase() {
    this.db = window.openDatabase('MEMODB', '2.0', 'MEMOS DATABASE', 0);
    await this.query(
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
  public query(query: string, values: string[]) {
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

  /**
   * Add row with an entity id, type, property and value
   */
  public async addRow(
    id: string,
    type: string,
    property: string,
    value: string
  ) {
    await this.query(
      'INSERT INTO MEMOS (ID,TYPE,PROPERTY,VALUE) VALUES (?,?,?,?)',
      [id, type, property, value]
    );
  }

  public async removeRowById(id: string) {
    await this.query('DELETE FROM MEMOS WHERE ID = ?', [id]);
  }

  public async dropDatabase() {
    await this.query('DROP TABLE MEMOS', []);
    await this.initDatabase();
  }
}
