import { Injectable } from '@angular/core';
import { AddService } from './add.service';
import { db } from './db';
import { FindService } from './find.service';
import { GetService } from './get.service';
import { QueryService } from './query.service';
import { RemoveService } from './remove.service';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  /**
   * Low level API for CRUD Database operations
   * Type: WebSQL
   * Memos has only one flexible table: Memos table
   * Memos 2.0 now has table of entities
   * Entity is a JavaScript object kept inside SQL database
   * with many rows notation
   * Here is the implementation by columns:
   * -- (ENTITY) ID: for unification entity, however many rows can share one ID
   * -- (ENTITY) PROPERTY: KEY <-> VALUE link, for example repeatDate, type, content, etc.
   * -- (ENTITY) VALUE: any time such as number, string or JSON ojbect
   *
   * DIRECTORY ENTITY:
   * ID __ PROPERTY __ VALUE
   * X4 __ TYPE ______ DIR
   * X4 __ TITLE _____ French
   * X4 __ ICON ______ 🇫🇷
   * X4 __ SIDES _____ [Original,Translation]
   * X4 __ OWNER:TITLE A4:French <== This is made to make sorting possible (by title)
   */

  /**
   * CARD ENTITY:
   * ID __ PROPERTY __ VALUE
   * X21 __ TYPE __ __ CARD
   * X21 __ CONTENT __ [PI, 3.14]
   * X21 __ OWNER:NEXTREPEAT __ *UNIX TIMESTAM*
   * X21 __ OWNER:LASTREPEAT __ *UNIX TIMESTAMP*
   * X21 __ OWNER:INTERVAL __ *HOURS*
   * X21 __ STATUS ____ *SIDES REPEATED, MAX INTERVAL?, PRIORITY?
   */

  /**
   * Manipulating rows with services
   * @param query
   * @param add
   * @param get
   *
   * Use call signatures such as:
   * db.get.rowById(id);
   * db.add.row(id,type,property,value)
   * db.remove.rowById(id);
   */

  constructor(
    public query: QueryService,
    public add: AddService,
    public get: GetService,
    public remove: RemoveService,
    public find: FindService
  ) {}

  public async drop() {
    // await this.query.run('DROP TABLE MEMOS', []);
    return await db.delete();
  }
}
