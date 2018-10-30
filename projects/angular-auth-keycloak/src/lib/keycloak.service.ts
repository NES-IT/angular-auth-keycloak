import {Inject, Injectable, InjectionToken, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, Subject, Subscription, timer} from 'rxjs';
import {filter, map, switchMap, tap} from 'rxjs/operators';
import {fromPromise } from 'rxjs/internal-compatibility';
import {OidcSettings} from './oidc-settings.model';
import {UserIdentity} from './user-identity.model';
import {UnauthorizedUserReaction} from './unauthorized-user.reaction';
import {st} from '@angular/core/src/render3';

// import (kinda) global variable
declare var Keycloak: any;

/**
 * Injection token for @class OidcSettings
 */
export const OIDC_SETTINGS = new InjectionToken<UnauthorizedUserReaction>('Configuration for OIDC authentication');

/**
 * KeycloakService wrap an instance of Keycloak js connector
 */
@Injectable({
  providedIn: 'root'
})
export class KeycloakService implements OnDestroy {
  private readonly keycloak;

  private readonly subscriptions: Array<Subscription>;
  private readonly internalAuthenticationStateStream: Subject<InternalAuthenticationState>;
  private readonly authenticationStateStream: Observable<boolean>;
  private readonly encodedAccessTokenStream: Observable<string>;
  private readonly accessTokenClaimsStream: Observable<object>;
  private readonly identityTokenClaimsStream: Observable<object>;
  private readonly tokenExpirationStream: Observable<number>;
  private readonly userIdentityStream: Observable<UserIdentity>;

  /**
   * @param oidcSettings Settings for OIDC protocol
   */
  constructor(@Inject(OIDC_SETTINGS) oidcSettings: OidcSettings) {
    this.keycloak = Keycloak({
      url: oidcSettings.url,
      realm: oidcSettings.realm,
      clientId: oidcSettings.clientId
    });

    this.subscriptions = [];
    this.internalAuthenticationStateStream = new BehaviorSubject<InternalAuthenticationState>(undefined);
    this.authenticationStateStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state),
        map((state) => state.isUserAuthenticated)
      );
    this.encodedAccessTokenStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.encodedAuthorizationToken)
      );
    this.accessTokenClaimsStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.authorizationTokenClaims)
      );
    this.identityTokenClaimsStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.identityTokenClaims)
      );
    this.tokenExpirationStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.authorizationTokenClaims.exp)
      );
    this.userIdentityStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => {
          const sub: string = state.identityTokenClaims.sub;
          const name: string = state.identityTokenClaims.name;
          const username: string = state.identityTokenClaims.preferred_username;
          const email: string = state.identityTokenClaims.email;
          const roles: string[] = state.authorizationTokenClaims.realm_access.roles;

          return new UserIdentity(sub, name, username, email, roles);
        })
      );

    const keycloakInitializationPromise = this.keycloak.init();
    const observableKeycloakInitializationResult = fromPromise(keycloakInitializationPromise);

    this.subscriptions.push(
      observableKeycloakInitializationResult
        .pipe(
          map(() => ({
            isUserAuthenticated: this.keycloak.authenticated,
            encodedAuthorizationToken: this.keycloak.token,
            authorizationTokenClaims: this.keycloak.tokenParsed,
            identityTokenClaims: this.keycloak.idTokenParsed
          })),
          tap((initialState: InternalAuthenticationState) => console.log('about to set the initial state', { initialState })),
          tap((initialState: InternalAuthenticationState) => this.internalAuthenticationStateStream.next(initialState)),
          // the Keycloak object already do this during initialization phase
          // but for some reason the hash reappear some time later,
          // doing it again here is just a workaround
          tap((initialState: InternalAuthenticationState) => this.removeEventualFragmentsFromUrl())
        )
        .subscribe()
    );

    this.subscriptions.push(
      this.tokenExpirationStream
        .pipe(
          map((tokenExpirationInSeconds) => tokenExpirationInSeconds * 1000),
          map((tokenExpirationInMilliseconds) => tokenExpirationInMilliseconds - Date.now()),
          map((millisecondsUntilTokenExpiration) => Math.max(0, millisecondsUntilTokenExpiration - 1000)),
          tap((millisecondsUntilTokenExpiration) => console.log('token will be refreshed in about ' + millisecondsUntilTokenExpiration + ' milliseconds')),
          switchMap(timer),
          tap(() => console.log('about to refresh token')),
          switchMap(() => this.refreshToken()),
          map(() => ({
            isUserAuthenticated: this.keycloak.authenticated,
            encodedAuthorizationToken: this.keycloak.token,
            authorizationTokenClaims: this.keycloak.tokenParsed,
            identityTokenClaims: this.keycloak.idTokenParsed
          })),
          tap((newState) => console.log('about to set the new state', { newState })),
          tap((newState) => this.internalAuthenticationStateStream.next(newState))
        )
        .subscribe()
    );
  }


  /**
   * Load Keycloak server login page.
   *
   * After the user complete the login, it will be redirected
   * to returnUrl.
   *
   * @param returnUrl the URL to be redirected at by Keycloak server
   * after the login.
   */
  public login(returnUrl?: string) {

    const actualReturnUrl: string = !!returnUrl
      ? returnUrl
      : location.href;

    console.log('initiating login', { returnURL: actualReturnUrl });

    this
      .keycloak
      .login({ redirectUri: actualReturnUrl });
  }

  /**
   * Load Keycloak server logout page.
   *
   * After the logout procedure has been completed,
   * if authenticateUserAtStartup option is enabled
   * Keycloak server will redirect the user to the login page,
   * otherwise the user will be redirected to returnUrl.
   *
   * @param returnUrl the URL to be redirected at by Keycloak server
   * after the login.
   */
  public logout(returnUrl?: string) {

    const actualReturnUrl: string = !!returnUrl
      ? returnUrl
      : location.href;

    console.log('initiating logout', { returnURL: actualReturnUrl });

    this
      .keycloak
      .logout({ redirectUri: actualReturnUrl });
  }

  /**
   * @return Observable<boolean> authenticationState true if the user has completed the login procedure and has been authenticated,
   * false otherwise
   */
  public isUserAuthenticated(): Observable<boolean> {
    return this.authenticationStateStream;
  }

  /**
   * @return Observable<UserIdentity>
   */
  public getUserIdentity(): Observable<UserIdentity> {
    return this.userIdentityStream;
  }

  /**
   * @return Observable<string> accessToken, the encoded bearer authorization token
   * released by Keycloak
   */
  public getAccessToken(): Observable<string> {
    return this.encodedAccessTokenStream;
  }

  /**
   * @return Observable<object> accessTokenClaims, claims contained in the authorization token
   * released by Keycloak
   */
  public getAccessTokenClaims(): Observable<object> {
    return this.accessTokenClaimsStream;
  }

  /**
   * @return Observable<object> identityTokenClaims, claims contained in the identity token
   * released by Keycloak
   */
  public getIdentityTokenClaims(): Observable<object> {
    return this.accessTokenClaimsStream;
  }



  private removeEventualFragmentsFromUrl() {
    const currentUrl = new URL(window.location.href);
    const currentUrlWithoutFragment = currentUrl.origin + currentUrl.pathname;

    window.history.replaceState({}, null, currentUrlWithoutFragment);
  }

  private refreshToken(): Observable<void> {

    const updateTokenPromise: Promise<boolean> = this.keycloak.updateToken(-1);

    return fromPromise(updateTokenPromise)
      .pipe(map((x) => null));
  }



  ngOnDestroy(): void {

    for (const subscription of this.subscriptions)
      subscription.unsubscribe();

  }

}

interface InternalAuthenticationState {
  isUserAuthenticated: boolean;
  encodedAuthorizationToken: string;
  authorizationTokenClaims: any;
  identityTokenClaims: any;
}

interface Claims {

  readonly exp: number;

}
