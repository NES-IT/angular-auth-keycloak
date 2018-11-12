import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {KeycloakService} from './keycloak.service';
import {combineLatest, Observable, of} from 'rxjs';
import {map, switchMap, take} from 'rxjs/operators';
import {Injectable} from '@angular/core';

@Injectable()
export class AuthorizationTokenInjectorInterceptor implements HttpInterceptor {

  constructor(private keycloakService: KeycloakService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const userAuthenticationStateStream = this.keycloakService
      .isUserAuthenticated()
      .pipe(take(1));

    const accessTokenStream = this.keycloakService
      .getAccessToken()
      .pipe(take(1));

    return combineLatest(
        of(req),
        of(next),
        userAuthenticationStateStream,
        accessTokenStream
      )
      .pipe(
        map(([request, nextHandler, isAuthenticated, accessToken]): InterceptionState => {
          return {
            nextHandler: nextHandler,
            request: !isAuthenticated
              ? request
              : request.clone({
                setHeaders: {
                  Authorization: `Bearer ${accessToken}`
                }
              })
          };
        }),
        switchMap((state: InterceptionState) => {
          const nextHandler = state.nextHandler;
          const request = state.request;

          return nextHandler.handle(request);
        })
      );
  }

}

interface InterceptionState {
  nextHandler: HttpHandler;
  request: HttpRequest<any>;
}
