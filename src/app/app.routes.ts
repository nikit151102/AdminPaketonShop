import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '', loadChildren: () => import('./modules/personal-account/personal-account.module').then(m => m.PersonalAccountModule),
    }
];
