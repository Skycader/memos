import { Injectable } from '@angular/core';

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
  public async initDatabase() {}
}
