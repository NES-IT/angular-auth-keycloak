import {Inject, Injectable, InjectionToken} from '@angular/core';
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {combineLatest, Observable, of} from 'rxjs';
import {KeycloakService} from './keycloak.service';
import {map, take, tap} from 'rxjs/operators';
import {UnauthenticatedUserReaction} from './unauthenticated-user.reaction';

/**
 * Injection token for @class UnauthenticatedUserReaction
 */
export const UNAUTHENTICATED_USER_REACTION = new InjectionToken<UnauthenticatedUserReaction>('Unauthenticated user reaction');

/**
 * Ensure that the user is authenticated by Keycloak server
 * prior to let him reach the route.
 *
 * If the user is not authenticated, the UnauthenticatedUserReaction will be triggered.
 */
@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  private readonly origin: string;

  constructor(
    private keycloakService: KeycloakService,
    @Inject(UNAUTHENTICATED_USER_REACTION) private unauthenticatedUserReaction: UnauthenticatedUserReaction) {

    this.origin = new URL(window.location.href).origin;
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {

    const userAuthenticationStateStream = this.keycloakService
      .isUserAuthenticated()
      .pipe(take(1));

    return combineLatest(
        of(next),
        of(state),
        userAuthenticationStateStream
      )
      .pipe(
        map(([nextActivatedRouteSnapshot, routerStateSnapshot, isAuthenticated]) => {
          return {
            nextActivatedRouteSnapshot: nextActivatedRouteSnapshot,
            routerStateSnapshot: routerStateSnapshot,
            isAuthenticated: isAuthenticated
          };
        }),
        tap((authenticationGuardState: AuthenticationGuardState) => {

          if (authenticationGuardState.isAuthenticated || !this.unauthenticatedUserReaction)
            return;

          this.unauthenticatedUserReaction.react(state);

        }),
        map((authenticationGuardState: AuthenticationGuardState) => {
          return authenticationGuardState.isAuthenticated;
        })
      );
  }
}

interface AuthenticationGuardState {
  nextActivatedRouteSnapshot: ActivatedRouteSnapshot;
  routerStateSnapshot: RouterStateSnapshot;
  isAuthenticated: boolean;
}
