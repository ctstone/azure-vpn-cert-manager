import { Component, OnInit } from '@angular/core';
import { BackendService } from './backend.service';
import { UserService } from './user.service';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'cert-root',
  templateUrl: 'app.component.html',
  styleUrls: []
})
export class AppComponent implements OnInit {
  constructor(
    public user: UserService,
    private backend: BackendService) {}

  ngOnInit() {
    this.backend.me()
      .pipe(
        tap((resp) => this.user.current = resp),
      )
      .subscribe();
  }
}
