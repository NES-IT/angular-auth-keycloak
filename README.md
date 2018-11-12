# angular-auth-keycloak
A library that wrap [Keycloak](https://www.keycloak.org) ( an [OpenID Connect](https://openid.net/connect/) server implementation ) own [Javascript Adapter](https://www.keycloak.org/docs/latest/securing_apps/index.html#_javascript_adapter), allowing an Angular app to rely on [Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth) for user authentication.

Authorization Code Flow is the default option and the one for which this library has been built.
Other flows could work too, but are not officially supported.

It has been developed with Angular 6 and Keycloak 4.5 as targets.
It's possible the library could work also with different targets version but, again, it's not officially supported.

## Installation
```
npm install --save @nes/angular-auth-keycloak
```

## Usage
Add Keycloak Javascript Adapter script to your page, you can source it directly from your running Keycloak server instance.
```
<script type="text/javascript" src="http://my-keycloak-server-address/auth/js/keycloak.js"></script>
```
Import [AngularAuthKeycloakModule](projects/angular-auth-keycloak/src/lib/angular-auth-keycloak.module.ts) into the root application module, providing configuration settings.

Using forRoot module method:
- the first argument define Keycloak context
- the second argument define the behavior that [AuthenticatedUserGuard](projects/angular-auth-keycloak/src/lib/authenticated-user.guard.ts) must adopt in case the user is not authenticated, there are two built-in implementations:
  - LoginIfUnauthenticated: redirect to Keycloak login page, it's the default behavior if none is specified
  - NavigateToRouteIfUnauthenticated: navigate to a route of current Angular application specified through UNAUTHENTICATED_USER_REDIRECTION_ROUTE injection token
- the third argument is optional, and define the behavior that [AuthorizedUserGuard](projects/angular-auth-keycloak/src/lib/authorized-user.guard.ts) must adopt in case the user account does not meet authorization criteria specified in the route, there is one built-in implementation:
  - NavigateToRouteIfUnauthorized: navigate to a route of current Angular application specified through UNAUTHORIZED_USER_REDIRECTION_ROUTE injection token

You are free to roll your own behaviors by extending [UnauthenticatedUserReaction](projects/angular-auth-keycloak/src/lib/unauthenticated-user.reaction.ts) and [UnauthorizedUserReaction](projects/angular-auth-keycloak/src/lib/unauthorized-user.reaction.ts) abstract classes.
```
const oidcSettings = {
  url: 'http://my-keycloak-server-address/auth',
  realm: 'my-secured-realm',
  clientId: 'this-relying-client-id'
};

@NgModule({
  declarations: [...],
  imports: [
    ...
    AngularAuthKeycloakModule.forRoot(
      oidcSettings,
      LoginIfUnauthenticated,
      NavigateToRouteIfUnauthorized
    ),
    ...
  ],
  providers: [
    ...
    {
      provide: UNAUTHORIZED_USER_REDIRECTION_ROUTE,
      useValue: '/unauthorized'
    },
    ...
  ],
  bootstrap: [...]
})
export class AppModule { }
```

Use [AuthenticatedUserGuard](projects/angular-auth-keycloak/src/lib/authenticated-user.guard.ts) to protect routes you want only authenticated user to access:
```
const routes: Routes = [
  ...
  { path: 'protected-page', component: ProtectedPageComponent, canActivate: [ AuthenticatedUserGuard ] }
  ...
];
```

Use [AuthorizedUserGuard](projects/angular-auth-keycloak/src/lib/authorized-user.guard.ts) to protect routes you want only user with a specific role to access:
```
const routes: Routes = [
  ...
  { path: 'protected-page', component: ProtectedPageComponent, data: { authorization: [ 'admin' ] }, canActivate: [ AuthorizededUserGuard ] }
  ...
];
```

## Development
### Library
The source code is located in [./projects/angular-auth-keycloak/](projects/angular-auth-keycloak)

To build it use `ng build angular-auth-keycloak`, it will then be available in [./dist/angular-auth-keycloak/](dist/angular-auth-keycloak).

### Sample App
The source code is located in [./src/app/](src/app)

To run the sample execute `ng serve`, it will then be available at `http://localhost:4200`.
