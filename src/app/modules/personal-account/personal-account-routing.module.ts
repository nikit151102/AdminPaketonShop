import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PersonalAccountComponent } from './personal-account.component';

const routes: Routes = [
  {
    path: '', component: PersonalAccountComponent,
    children: [
      // {
      //   path: '',
      //   redirectTo: 'profile',
      //   pathMatch: 'full'
      // },
      // {
      //   path: 'profile',
      //   loadChildren: () => import('./tabs/user-data/user-data.module').then(m => m.UserDataModule)
      // },

    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PersonalAccountRoutingModule { }
