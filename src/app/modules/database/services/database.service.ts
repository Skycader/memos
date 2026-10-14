import { Injectable } from '@angular/core';
import { AddService } from './add.service';
import { db } from './db';
import { GetService } from './get.service';
import { RemoveService } from './remove.service';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  /**
   * Low level API for CRUD database operations over Dexie (IndexedDB)
   *
   * Two tables, see db.ts:
   * · directory: id, owner, icon, title, fields[]
   * · card:      id, owner, contents[], next, prev, spec
   * `owner` is the id of the directory above ('/' is the root, it is not stored).
   * Indexes: directory [owner+title], owner, title; card owner.
   *
   * Operations are split by kind, use call signatures such as:
   * db.add.dir(id, owner, icon, title, fields)
   * db.get.dirByOwner(owner)
   * db.remove.dirById(id)   (removes everything inside too, in one transaction)
   */

  constructor(
    public add: AddService,
    public get: GetService,
    public remove: RemoveService
  ) {}

  public async drop() {
    return await db.delete();
  }
}
