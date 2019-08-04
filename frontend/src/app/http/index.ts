import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { ErrorInterceptorService } from './error-interceptor.service';
import { LoginInterceptorService } from './login-interceptor.service';

export const httpInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptorService, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: LoginInterceptorService, multi: true },
];
