import { Injectable } from '@angular/core';
import { db } from './db';

@Injectable({
  providedIn: 'root',
})
export class QueryService {
  /**
   * Database reference for all SQL operations
   */
  public db: any = db;

  constructor() {
    this.initDatabase();
  }

  /**
   * Database initialization sequence
   */
  public async initDatabase() {
    this.db.on('ready', () => {
      console.log('DB READY');
    });
  }
}
