import {ModuleWithProviders, NgModule, Provider, Type} from '@angular/core';
import {KeycloakService, OIDC_SETTINGS} from './keycloak.service';
import {OidcSettings} from './oidc-settings.model';
import {AuthenticatedUserGuard, UNAUTHENTICATED_USER_REACTION} from './authenticated-user.guard';
import {LoginIfUnauthenticated, UnauthenticatedUserReaction} from './unauthenticated-user.reaction';
import {UnauthorizedUserReaction} from './unauthorized-user.reaction';
import {AuthorizedUserGuard, UNAUTHORIZED_USER_REACTION} from './authorized-user.guard';
import {AccessTokenInjectorInterceptor} from './access-token-injector.interceptor';
import {HTTP_INTERCEPTORS} from '@angular/common/http';

@NgModule()
export class AngularAuthKeycloakModule {

  static forRoot(oidcSettings: OidcSettings, unauthenticatedUserReactionType?: Type<UnauthenticatedUserReaction>, unauthorizedUserReactionType?: Type<UnauthorizedUserReaction>): ModuleWithProviders {
    return {
      ngModule: AngularAuthKeycloakModule,
      providers: [
        KeycloakService,
        {
          provide: OIDC_SETTINGS,
          useValue: oidcSettings
        },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AccessTokenInjectorInterceptor,
          multi: true
        },
        AuthenticatedUserGuard,
        {
          provide: UNAUTHENTICATED_USER_REACTION,
          useClass: unauthenticatedUserReactionType || LoginIfUnauthenticated
        },
        AuthorizedUserGuard,
        (!!unauthorizedUserReactionType)
          ? {
            provide: UNAUTHORIZED_USER_REACTION,
            useClass: unauthorizedUserReactionType
          }
          : {
            provide: UNAUTHORIZED_USER_REACTION,
            useValue: null
          }
      ]
    };
  }

}
