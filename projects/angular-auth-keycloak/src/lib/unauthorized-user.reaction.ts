import {UserIdentity} from './user-identity.model';
import {KeycloakService} from './keycloak.service';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {Inject, Injectable, InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {fromPromise} from 'rxjs/internal-compatibility';

export abstract class UnauthorizedUserReaction {

  protected constructor(protected keycloakService: KeycloakService) {}

  public abstract react(nextRouteSnapshot: ActivatedRouteSnapshot, stateSnapshot: RouterStateSnapshot, user: UserIdentity): void;

}

/**
 * Injection token for @class UnauthenticatedUserReaction
 */
export const UNAUTHORIZED_USER_REDIRECTION_ROUTE = new InjectionToken<string>('route to which redirect unauthorized user');

@Injectable()
export class NavigateToRouteIfUnauthorized extends UnauthorizedUserReaction {

  constructor(keycloakService: KeycloakService, protected router: Router, @Inject(UNAUTHORIZED_USER_REDIRECTION_ROUTE) protected route: string) {
    super(keycloakService);
  }

  react(nextRouteSnapshot: ActivatedRouteSnapshot, stateSnapshot: RouterStateSnapshot, user: UserIdentity): void {
    const navigationResult: Observable<boolean> = fromPromise(this.router.navigateByUrl(this.route));

    navigationResult
      .subscribe();
  }

}
