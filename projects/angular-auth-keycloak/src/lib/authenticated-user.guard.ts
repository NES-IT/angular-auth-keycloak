import {Inject, Injectable} from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { KeycloakService } from './keycloak.service';
import { take, tap } from 'rxjs/operators';
import {Configuration, CONFIGURATION_INJECTION_TOKEN} from './config.model';

/**
 * Ensure that the user is authenticated by Keycloak server
 * prior to let him reach the route.
 *
 * If the user is not authenticated, it will be redirected to Keycloak server login page.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthenticatedUserGuard implements CanActivate {
  private readonly origin: string;

  constructor(@Inject(CONFIGURATION_INJECTION_TOKEN) private configuration: Configuration, private keycloakService: KeycloakService) {
    this.origin = new URL(window.location.href).origin;
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {

    const returnURL = this.getReturnURL(state);

    return this
      .keycloakService
      .isUserAuthenticated()
      .pipe(
        take(1),
        tap(this.loginIfNecessary(returnURL))
      );

  }

  private getReturnURL(state: RouterStateSnapshot): string {
    const returnURLWithFragment = new URL(this.origin + state.url);

    return returnURLWithFragment.origin + returnURLWithFragment.pathname;
  }

  private loginIfNecessary(returnURL: string): (boolean) => void {

    return (isUserLoggedIn) => {

      if (isUserLoggedIn || this.configuration.automaticallyAuthenticateUserAtStartup)
        return;

      this.keycloakService.login(returnURL);
    };

  }
}
