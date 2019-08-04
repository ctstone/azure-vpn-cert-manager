import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { UsersComponent } from './users/users.component';
import { CaComponent } from './ca/ca.component';
import { UserComponent } from './user/user.component';


const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  { path: 'users', children: [
    { path: '', pathMatch: 'full', component: UsersComponent },
    { path: ':user', component: UserComponent },
  ] },
  { path: 'ca', component: CaComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
