import {KeycloakService} from './keycloak.service';
import {Router, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {fromPromise} from 'rxjs/internal-compatibility';
import {Inject, Injectable, InjectionToken} from '@angular/core';

export abstract class UnauthenticatedUserReaction {

  protected constructor(protected keycloakService: KeycloakService) {}

  public abstract react(state: RouterStateSnapshot): void;

}

@Injectable()
export class LoginIfUnauthenticated extends UnauthenticatedUserReaction {

  private readonly origin: string;

  constructor(keycloakService: KeycloakService) {
    super(keycloakService);

    this.origin = new URL(window.location.href).origin;
  }

  react(state: RouterStateSnapshot): void {
    const returnUrl = this.getReturnURL(state);

    this.keycloakService.login(returnUrl);
  }

  private getReturnURL(state: RouterStateSnapshot): string {
    const returnURLWithFragment = new URL(this.origin + state.url);

    return returnURLWithFragment.origin + returnURLWithFragment.pathname;
  }

}

/**
 * Injection token for @class UnauthenticatedUserReaction
 */
export const UNAUTHENTICATED_USER_REDIRECTION_ROUTE = new InjectionToken<string>('route to which redirect unauthorized user');

@Injectable()
export class NavigateToRouteIfUnauthenticated extends UnauthenticatedUserReaction {

  constructor(keycloakService: KeycloakService, protected router: Router, @Inject(UNAUTHENTICATED_USER_REDIRECTION_ROUTE) protected route: string) {
    super(keycloakService);
  }

  react(state: RouterStateSnapshot): void {
    const navigationResult: Observable<boolean> = fromPromise(this.router.navigateByUrl(this.route));

    navigationResult
      .subscribe();
  }

}
