import { Injectable } from '@angular/core';
import { QueryService } from './query.service';
import { RowService } from './row.service';

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

  constructor(private query: QueryService, public row: RowService) {}

  public async drop() {
    await this.query.run('DROP TABLE MEMOS', []);
  }
}
