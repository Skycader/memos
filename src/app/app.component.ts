import { Component } from '@angular/core';
import { DatabaseService } from './modules/database/services/database.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'memos 2.0';

  constructor(private db: DatabaseService) {}

  ngOnInit() {
    this.db.initDatabase();
    // this.db.query('SELECT * FROM OBJECTS');
    // this.db.queryResults.subscribe((res: any) => {
    //   console.log(res);
    // });
  }
}
