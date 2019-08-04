import { Component, OnInit } from '@angular/core';
import { BackendService } from '../backend.service';
import { User } from 'common';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'cert-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {

  users: string[];

  constructor(private backend: BackendService) { }

  ngOnInit() {
    this.backend.users()
      .pipe(
        tap((resp) => this.users = resp),
      )
      .subscribe();
  }

}
