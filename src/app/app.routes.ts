import { Routes } from '@angular/router';

export const routes: Routes = [

    {
        path: '', loadComponent: () => import('./modules/auth/auth.component').then(m => m.AuthComponent),
    },
    {
        path: 'order/:id', loadComponent: () => import('./additional_pages/site-order/site-order.component').then(m => m.SiteOrderComponent),
    },
    {
        path: 'wholesaleOrder/:id', loadComponent: () => import('./additional_pages/wholesale-order/wholesale-order.component').then(m => m.WholesaleOrderComponent),
    },
    {
        path: 'individualWholesaleOrder/:id', loadComponent: () => import('./additional_pages/individual-wholesale-order/individual-wholesale-order.component').then(m => m.IndividualWholesaleOrderComponent),
    },
    {
        path: 'user', loadChildren: () => import('./modules/personal-account/personal-account.module').then(m => m.PersonalAccountModule),
    }


];
