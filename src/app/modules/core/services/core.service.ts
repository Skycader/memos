import { Injectable } from '@angular/core';
import { DatabaseService } from '../../database/services/database.service';
import { MathService } from '../../math/services/math.service';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  /**
   * Core service
   * used for abstract operations over database such as:
   * · Add catalog
   * · Add card
   */
  constructor(private math: MathService, private db: DatabaseService) {}

  public async addCatalog(
    icon: string,
    title: string,
    sides: string[],
    path: string
  ) {
    const id = this.math.makeId(10);
    await this.db.add.row(id, 'CATALOG', 'ICON', icon);
    await this.db.add.row(id, 'CATALOG', 'TITLE', title);
    await this.db.add.row(id, 'CATALOG', 'SIDES', JSON.stringify(sides));
    await this.db.add.row(id, 'CATALOG', 'PATH', path);
  }

  /**
   * Drop database
   */
  public async drop() {
    await this.db.drop();
  }
}
