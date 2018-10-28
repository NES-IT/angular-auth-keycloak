import {Inject, Injectable, InjectionToken} from '@angular/core';
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {combineLatest, Observable, of} from 'rxjs';
import {KeycloakService} from './keycloak.service';
import {map, take, tap} from 'rxjs/operators';
import {UnauthorizedUserReaction} from './unauthorized-user.reaction';
import {UserIdentity} from './user-identity.model';

/**
 * Injection token for {UnauthorizedUserReaction} UnauthorizedUserReaction
 */
export const UNAUTHORIZED_USER_REACTION = new InjectionToken<UnauthorizedUserReaction>('Unauthorized user reaction');

/**
 * Ensure that the user is authenticated by Keycloak server
 * prior to let him reach the route.
 *
 * If the user is not authenticated, the UnauthenticatedUserReaction will be triggered.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthorizedUserGuard implements CanActivate {
  private readonly origin: string;

  constructor(
    private keycloakService: KeycloakService,
    @Inject(UNAUTHORIZED_USER_REACTION) private unauthorizedUserReaction: UnauthorizedUserReaction) {

    this.origin = new URL(window.location.href).origin;
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {

    const userIdentityStream = this.keycloakService
      .getUserIdentity()
      .pipe(take(1));

    return combineLatest(
        of(next),
        of(state),
        userIdentityStream
      )
      .pipe(
        map(([nextActivatedRouteSnapshot, routerStateSnapshot, userIdentity]) => {
          const authorizationRules = nextActivatedRouteSnapshot.data['authorization'] as { allowedRoles: Array<string> };
          const allowedRoles = authorizationRules.allowedRoles || [];

          return {
            nextActivatedRouteSnapshot: nextActivatedRouteSnapshot,
            routerStateSnapshot: routerStateSnapshot,
            userIdentity: userIdentity,
            isAuthorized: userIdentity != null && allowedRoles.some(userIdentity.hasRole)
          };
        }),
        tap((authorizationGuardState: AuthorizationGuardState) => {

          if (authorizationGuardState.isAuthorized || !this.unauthorizedUserReaction)
            return;

          this.unauthorizedUserReaction.react(
            authorizationGuardState.nextActivatedRouteSnapshot,
            authorizationGuardState.routerStateSnapshot,
            authorizationGuardState.userIdentity
          );

        }),
        map((authorizationState: AuthorizationGuardState) => {
          return authorizationState.isAuthorized;
        })
      );
  }
}

interface AuthorizationGuardState {
  nextActivatedRouteSnapshot: ActivatedRouteSnapshot;
  routerStateSnapshot: RouterStateSnapshot;
  userIdentity: UserIdentity;
  isAuthorized: boolean;
}
