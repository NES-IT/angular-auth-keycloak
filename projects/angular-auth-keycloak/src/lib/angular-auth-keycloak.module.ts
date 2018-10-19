import {ModuleWithProviders, NgModule} from '@angular/core';
import {Configuration, CONFIGURATION_INJECTION_TOKEN} from './config.model';
import {KeycloakService} from './keycloak.service';

@NgModule()
export class AngularAuthKeycloakModule {

  static forRoot(configuration: Configuration): ModuleWithProviders {

    return {
      ngModule: AngularAuthKeycloakModule,
      providers: [
        KeycloakService,
        {
          provide: CONFIGURATION_INJECTION_TOKEN,
          useValue: configuration
        }
      ]
    };

  }

}
