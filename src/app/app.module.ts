import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AngularAuthKeycloakModule } from '../../projects/angular-auth-keycloak/src/lib/angular-auth-keycloak.module';
import { ProtectedPageComponent } from './protected-page/protected-page.component';
import { RouterModule, Routes } from '@angular/router';
import { AuthenticatedUserGuard } from '../../projects/angular-auth-keycloak/src/lib/authenticated-user.guard';
import { RouterTestingModule } from '@angular/router/testing';
import { PublicPageComponent } from './public-page/public-page.component';

const routes: Routes = [
  { path: '', redirectTo: 'protected', pathMatch: 'full' },
  { path: 'protected', component: ProtectedPageComponent, canActivate: [ AuthenticatedUserGuard ] }
];

@NgModule({
  declarations: [
    AppComponent,
    ProtectedPageComponent,
    PublicPageComponent
  ],
  imports: [
    BrowserModule,
    AngularAuthKeycloakModule.forRoot({
      oidcSettings: {
        url: 'http://localhost:8080/auth',
        realm: 'my-keycloak-secured-realm',
        clientId: 'this-keycloak-relying-client'
      },
      automaticallyAuthenticateUserAtStartup: true,
      automaticallyRefreshToken: true
    }),
    RouterModule.forRoot(routes),
    RouterTestingModule
  ],
  providers: [ ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
