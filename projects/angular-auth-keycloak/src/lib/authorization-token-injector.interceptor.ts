import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {KeycloakService} from './keycloak.service';
import {combineLatest, Observable, of} from 'rxjs';
import {map, switchMap, take} from 'rxjs/operators';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';

export class AuthorizationTokenInjectorInterceptor implements HttpInterceptor {

  constructor(private keycloakService: KeycloakService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const userAuthenticationStateStream = this.keycloakService
      .isUserAuthenticated()
      .pipe(take(1));

    return combineLatest(
        of(req),
        of(next),
        of(this.keycloakService),
        userAuthenticationStateStream
      )
      .pipe(
        map(([request, nextHandler, keycloakService, isAuthenticated]): InterceptionState => {
          return {
            request: request,
            nextHandler: nextHandler,
            keycloakService: keycloakService,
            isAuthenticated: isAuthenticated
          };
        }),
        switchMap(),
        switchMap((interceptionState: InterceptionState) => {
          const request = interceptionState.request;
          const nextHandler = interceptionState.nextHandler;

          return nextHandler.handle(request);
        })
      );
  }

}

interface InterceptionState {
  request: HttpRequest<any>;
  nextHandler: HttpHandler;
  keycloakService: KeycloakService;
  isAuthenticated: boolean;
}
