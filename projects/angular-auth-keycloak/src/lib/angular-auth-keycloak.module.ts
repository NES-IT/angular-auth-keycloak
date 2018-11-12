import {ModuleWithProviders, NgModule, Provider, Type} from '@angular/core';
import {KeycloakService, OIDC_SETTINGS} from './keycloak.service';
import {OidcSettings} from './oidc-settings.model';
import {UNAUTHENTICATED_USER_REACTION} from './authenticated-user.guard';
import {LoginIfUnauthenticated, UnauthenticatedUserReaction} from './unauthenticated-user.reaction';
import {UnauthorizedUserReaction} from './unauthorized-user.reaction';
import {UNAUTHORIZED_USER_REACTION} from './authorized-user.guard';
import {AuthorizationTokenInjectorInterceptor} from './authorization-token-injector.interceptor';
import {HTTP_INTERCEPTORS} from '@angular/common/http';

@NgModule()
export class AngularAuthKeycloakModule {

  static forRoot(oidcSettings: OidcSettings, unauthenticatedUserReactionType?: Type<UnauthenticatedUserReaction>, unauthorizedUserReactionType?: Type<UnauthorizedUserReaction>): ModuleWithProviders {

    const keycloakServiceProvider: Provider = this.getKeycloakServiceProvider();
    const oidcSettingsProvider: Provider = this.getOidcSettingsProvider(oidcSettings);
    const authorizationTokenInjectorProvider: Provider = this.getAuthorizationTokenInjectorProvider();
    const unauthenticatedUserReactionProvider: Provider = this.getUnauthenticatedUserReactionProvider(unauthenticatedUserReactionType);
    const unauthorizedUserReactionProvider: Provider = this.getUnauthorizedUserReactionProvider(unauthorizedUserReactionType);

    return {
      ngModule: AngularAuthKeycloakModule,
      providers: [
        keycloakServiceProvider,
        oidcSettingsProvider,
        authorizationTokenInjectorProvider,
        unauthenticatedUserReactionProvider,
        unauthorizedUserReactionProvider
      ]
    };

  }

  private static getKeycloakServiceProvider(): Provider {
    return KeycloakService;
  }

  private static getOidcSettingsProvider(oidcSettings: OidcSettings): Provider {
    return {
      provide: OIDC_SETTINGS,
      useValue: oidcSettings
    };
  }

  private static getAuthorizationTokenInjectorProvider(): Provider {
    return {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthorizationTokenInjectorInterceptor,
      multi: true
    };
  }

  private static getUnauthenticatedUserReactionProvider(unauthenticatedUserReactionType?: Type<UnauthenticatedUserReaction>): Provider {
    return {
      provide: UNAUTHENTICATED_USER_REACTION,
      useClass: unauthenticatedUserReactionType || LoginIfUnauthenticated
    };
  }

  private static getUnauthorizedUserReactionProvider(unauthorizedUserReactionType?: Type<UnauthorizedUserReaction>): Provider {
    return (!!unauthorizedUserReactionType)
      ? {
        provide: UNAUTHORIZED_USER_REACTION,
        useClass: unauthorizedUserReactionType
      }
      : {
        provide: UNAUTHORIZED_USER_REACTION,
        useValue: null
      };
  }

}
