import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UserListComponent } from './user-list/user-list.component';
import { CaComponent } from './ca/ca.component';
import { UserComponent } from './user/user.component';
import { UserCreateComponent } from './user-create/user-create.component';


const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  { path: 'users', children: [
    { path: '', pathMatch: 'full', component: UserListComponent },
    { path: 'add', component: UserCreateComponent },
    { path: ':user', component: UserComponent },
  ] },
  { path: 'ca', component: CaComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
