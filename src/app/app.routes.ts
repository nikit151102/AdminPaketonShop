import { Routes } from '@angular/router';

export const routes: Routes = [
    
        {
        path: '', loadComponent: () => import('./modules/auth/auth.component').then(m => m.AuthComponent),
    },
    {
        path: 'user', loadChildren: () => import('./modules/personal-account/personal-account.module').then(m => m.PersonalAccountModule),
    }
    
];
