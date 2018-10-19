import { InjectionToken } from '@angular/core';

export interface Configuration {

  oidcSettings: OidcSettings;

  automaticallyAuthenticateUserAtStartup: boolean;
  automaticallyRefreshToken: boolean;

}

export interface OidcSettings {

  url: string;
  realm: string;
  clientId: string;

}

export const CONFIGURATION_INJECTION_TOKEN = new InjectionToken<Configuration>('Configuration for keycloak based OIDC authentication');
