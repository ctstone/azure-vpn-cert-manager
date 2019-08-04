import { HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptorService implements HttpInterceptor {

  constructor() { }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req)
      .pipe(
        catchError((err: any) => {
          if (err instanceof HttpErrorResponse) {
            const body = err.error;
            let message: string;
            if (body && body.error) {
              message = body.error.message;
            } else if (typeof body === 'string') {
              message = body;
            } else if (body) {
              message = JSON.stringify(body);
            } else {
              message = err.statusText;
            }

            alert(message);
          }
          return throwError(err);
        }),
      );
  }
}
