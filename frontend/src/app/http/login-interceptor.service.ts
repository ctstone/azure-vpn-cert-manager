import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { empty, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class LoginInterceptorService implements HttpInterceptor {

  private handled = false;

  constructor() { }

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    if (!req.url.startsWith('api') && !req.url.startsWith('/api')) { return next.handle(req); }


    if (this.handled) {
      this.handled = false;
    }

    return next.handle(req)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) {
            if (!this.handled) {
              this.handled = true;
              const { login } = err.error;
              window.location.assign(`${login}?redirect=${encodeURIComponent(window.location.href)}`);
            }
            return empty();
          } else {
            return throwError(err);
          }
        }),
      );
  }
}
