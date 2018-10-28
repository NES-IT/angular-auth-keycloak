import {UserIdentity} from './user-identity.model';
import {KeycloakService} from './keycloak.service';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';

export abstract class UnauthorizedUserReaction {

  protected constructor(protected keycloakService: KeycloakService) {}

  public abstract react(nextRouteSnapshot: ActivatedRouteSnapshot, stateSnapshot: RouterStateSnapshot, user: UserIdentity): void;

}
