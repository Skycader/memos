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
  constructor(private math: MathService, private database: DatabaseService) {}

  public async addCatalog(
    icon: string,
    title: string,
    sides: string[],
    path: string
  ) {
    const id = this.math.makeId(10);
    await this.database.row.add(id, 'CATALOG', 'ICON', icon);
    await this.database.row.add(id, 'CATALOG', 'TITLE', title);
    await this.database.row.add(id, 'CATALOG', 'SIDES', JSON.stringify(sides));
    await this.database.row.add(id, 'CATALOG', 'PATH', path);
  }

  public async dropDatabase() {
    await this.database.dropDatabase();
  }
}
