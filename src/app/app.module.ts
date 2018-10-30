import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AngularAuthKeycloakModule } from '../../projects/angular-auth-keycloak/src/lib/angular-auth-keycloak.module';
import { ProtectedPageComponent } from './protected-page/protected-page.component';
import { RouterModule, Routes } from '@angular/router';
import { AuthenticatedUserGuard } from '../../projects/angular-auth-keycloak/src/lib/authenticated-user.guard';
import { RouterTestingModule } from '@angular/router/testing';
import { PublicPageComponent } from './public-page/public-page.component';
import { WelcomePageComponent } from './welcome-page/welcome-page.component';
import {OidcSettings} from '../../projects/angular-auth-keycloak/src/lib/oidc-settings.model';
import {
  NavigateToRoute,
  UNAUTHENTICATED_USER_REDIRECTION_ROUTE
} from '../../projects/angular-auth-keycloak/src/lib/unauthenticated-user.reaction';

const routes: Routes = [
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  { path: 'welcome', component: WelcomePageComponent },
  { path: 'public', component: PublicPageComponent },
  { path: 'protected', component: ProtectedPageComponent, canActivate: [ AuthenticatedUserGuard ] }
];

const oidcSettings: OidcSettings = {
  url: 'http://localhost:8100/auth',
  realm: 'test-realm',
  clientId: 'test-realm-spa-client'
};

@NgModule({
  declarations: [
    AppComponent,
    ProtectedPageComponent,
    PublicPageComponent,
    WelcomePageComponent
  ],
  imports: [
    BrowserModule,
    AngularAuthKeycloakModule.forRoot(
      oidcSettings,
      NavigateToRoute
    ),
    RouterModule.forRoot(routes),
    RouterTestingModule
  ],
  providers: [
    {
      provide: UNAUTHENTICATED_USER_REDIRECTION_ROUTE,
      useValue: '/welcome'
    }
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
