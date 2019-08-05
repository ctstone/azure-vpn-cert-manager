import { Component, OnInit } from '@angular/core';
import { BackendService } from '../backend.service';
import { User } from 'common';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'cert-users',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {

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
