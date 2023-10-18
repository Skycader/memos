import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { debug } from './extensions/debug';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then((res) => {
    debug();
  })
  .catch((err) => console.error(err));
