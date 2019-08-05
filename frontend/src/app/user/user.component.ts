import { Component, OnInit, OnDestroy } from '@angular/core';
import { BackendService } from '../backend.service';
import { ActivatedRoute, Router } from '@angular/router';
import { flatMap, tap } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cert-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit, OnDestroy {

  userId: string;
  private s1: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backend: BackendService) { }

  ngOnInit() {
    this.s1 = this.route.paramMap
      .pipe(
        tap((params) => this.userId = params.get('user')),
        flatMap(() => this.backend.certificateAuthoritiesForUser(this.userId)),
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.s1.unsubscribe();
  }

}
