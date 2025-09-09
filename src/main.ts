import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []), // объединяем существующие провайдеры
    provideCharts(withDefaultRegisterables()) // добавляем Chart.js
  ]
}).catch(err => console.error(err));
