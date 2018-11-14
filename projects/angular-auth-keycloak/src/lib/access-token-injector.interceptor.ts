import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {AuthenticationState, KeycloakService} from './keycloak.service';
import {combineLatest, Observable, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {Injectable} from '@angular/core';

@Injectable()
export class AccessTokenInjectorInterceptor implements HttpInterceptor {
  private readonly _authenticationStateStream: Observable<AuthenticationState>;

  constructor(keycloakService: KeycloakService) {
    this._authenticationStateStream = keycloakService.getAuthenticationState();
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    return combineLatest(
        of(req),
        of(next),
        this._authenticationStateStream
      )
      .pipe(
        map(([request, nextHandler, authenticationState]): InterceptionState => {
          return {
            nextHandler: nextHandler,
            request: !authenticationState.isUserAuthenticated
              ? request
              : request.clone({
                setHeaders: {
                  Authorization: `Bearer ${authenticationState.accessToken}`
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
