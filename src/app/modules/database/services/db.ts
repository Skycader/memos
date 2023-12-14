// db.ts
import Dexie, { Table } from 'dexie';

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
  spec: object;
}

export class AppDB extends Dexie {
  directory!: Table<Directory, number>;
  card!: Table<Card, number>;

  constructor() {
    super('memos');
    this.version(1).stores({
      directory: 'id, owner, icon, title,fields',
      card: 'id, owner, contents',
    });
  }
}

export const db = new AppDB();
