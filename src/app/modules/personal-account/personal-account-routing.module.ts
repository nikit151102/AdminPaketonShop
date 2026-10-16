import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PersonalAccountComponent } from './personal-account.component';

const routes: Routes = [
  {
    path: '', component: PersonalAccountComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadChildren: () => import('./tabs/home/home.module').then(m => m.HomeModule)
      },
      {
        path: 'products',
        loadComponent: () => import('./tabs/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'article',
        loadComponent: () => import('./tabs/articles/articles.component').then(m => m.ArticlesComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./tabs/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./tabs/orders/orders.component').then(m => m.OrdersComponent)
      },
      {
        path: 'ordersStat',
        loadComponent: () => import('./tabs/orders-stat/orders-stat.component').then(m => m.OrdersStatComponent)
      },
      {
        path: 'B2Borders',
        loadComponent: () => import('./tabs/b2b-orders/b2b-orders.component').then(m => m.B2bOrdersComponent)
      },
      {
        path: 'B2BordersStat',
        loadComponent: () => import('./tabs/b2-b-orders-stat/b2-b-orders-stat.component').then(m => m.B2BOrdersStatComponent)
      },
      {
        path: 'barcode',
        loadComponent: () => import('./tabs/barcode-management/barcode-management.component').then(m => m.BarcodeManagementComponent)
      },
      {
        path: 'stores',
        loadComponent: () => import('./tabs/stores/stores.component').then(m => m.StoresComponent)
      },
      {
        path: 'reference',
        loadComponent: () => import('./tabs/reference/reference.component').then(m => m.ReferenceComponent)
      },
      {
        path: 'content',
        loadComponent: () => import('./tabs/news-banner-promo-management/news-banner-promo-management.component').then(m => m.NewsBannerPromoComponent)
      },
      {
        path: 'stocks',
        loadComponent: () => import('./tabs/stocks/stocks.component').then(m => m.StocksComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./tabs/product-category-manager/product-category-manager.component').then(m => m.ProductCategoryManagerComponent)
      },
      {
        path: 'niches',
        loadComponent: () => import('./tabs/niche-management/niche-management.component').then(m => m.NicheManagementComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PersonalAccountRoutingModule { }
