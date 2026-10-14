// db.ts
import Dexie, { Table } from 'dexie';
import { CardSPEC } from '../../core/models/spec.model';

export interface Directory {
  id: string;
  owner: string;
  icon: string;
  title: string;
  fields: string[];
}

export interface Card {
  id: string;
  owner: string;
  contents: string[];
  next: number;
  prev: number;
  spec: CardSPEC;
}

export class AppDB extends Dexie {
  directory!: Table<Directory, number>;
  card!: Table<Card, number>;

  constructor(name = 'memos') {
    super(name);
    this.version(1).stores({
      directory: 'id, owner, icon, title,fields',
      card: 'id, owner, contents',
    });

    /**
     * v2: no indexes over arrays (fields, contents), they are never searched by.
     * [owner+title] makes looking a directory up by name inside its owner fast.
     * Not unique on purpose: uniqueness is checked by CoreService.mkdir,
     * so the upgrade can not fail on data that already has duplicates.
     */
    this.version(2).stores({
      directory: 'id, owner, icon, title, [owner+title]',
      card: 'id, owner',
    });
  }
}

export const db = new AppDB();

/**
 * Erase everything and leave an empty, open database behind.
 * Dexie closes a database it has deleted, so without the open() every later
 * query would fail with DatabaseClosedError until the page was reloaded
 */
export async function wipe(database: AppDB) {
  await database.delete();
  await database.open();
}
