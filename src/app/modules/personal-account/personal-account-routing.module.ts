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
        loadChildren: () => import('./tabs/products/products.module').then(m => m.ProductsModule)
      },
      {
        path: 'users',
        loadComponent: () => import('./tabs/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'reference',
        loadComponent: () => import('./tabs/reference/reference.component').then(m => m.ReferenceComponent)
      },


    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PersonalAccountRoutingModule { }
