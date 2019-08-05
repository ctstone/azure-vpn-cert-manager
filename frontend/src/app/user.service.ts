import { Injectable } from '@angular/core';
import { UserIdentity } from 'common';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  current: UserIdentity;

  constructor() { }
}
