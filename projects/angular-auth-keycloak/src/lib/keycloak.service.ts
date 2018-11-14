import {Inject, Injectable, InjectionToken, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, Subject, Subscription, timer} from 'rxjs';
import {filter, map, switchMap, tap} from 'rxjs/operators';
import {fromPromise } from 'rxjs/internal-compatibility';
import {OidcSettings} from './oidc-settings.model';
import {UserIdentity} from './user-identity.model';
import {UnauthorizedUserReaction} from './unauthorized-user.reaction';

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
  private readonly _keycloak;

  private readonly _subscriptions: Array<Subscription>;
  private readonly _internalAuthenticationStateStream: Subject<InternalAuthenticationState>;
  private readonly _authenticationStateStream: Observable<AuthenticationState>;
  private readonly _isUserAuthenticatedStream: Observable<boolean>;
  private readonly _encodedAccessTokenStream: Observable<string>;
  private readonly _accessTokenClaimsStream: Observable<object>;
  private readonly _identityTokenClaimsStream: Observable<object>;
  private readonly _tokenExpirationStream: Observable<number>;
  private readonly _userIdentityStream: Observable<UserIdentity>;

  /**
   * @param oidcSettings Settings for OIDC protocol
   */
  constructor(@Inject(OIDC_SETTINGS) oidcSettings: OidcSettings) {
    this._keycloak = Keycloak({
      url: oidcSettings.url,
      realm: oidcSettings.realm,
      clientId: oidcSettings.clientId
    });

    this._subscriptions = [];
    this._internalAuthenticationStateStream = new BehaviorSubject<InternalAuthenticationState>(undefined);
    this._authenticationStateStream = this._internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state),
        map((state) => ({ isUserAuthenticated: state.isUserAuthenticated, accessToken: state.accessToken }))
      );
    this._isUserAuthenticatedStream = this._internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state),
        map((state) => state.isUserAuthenticated)
      );
    this._encodedAccessTokenStream = this._internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.accessToken)
      );
    this._accessTokenClaimsStream = this._internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.accessTokenClaims)
      );
    this._identityTokenClaimsStream = this._internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.identityTokenClaims)
      );
    this._tokenExpirationStream = this._internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.accessTokenClaims.exp)
      );
    this._userIdentityStream = this._internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => {
          const sub: string = state.identityTokenClaims.sub;
          const name: string = state.identityTokenClaims.name;
          const username: string = state.identityTokenClaims.preferred_username;
          const email: string = state.identityTokenClaims.email;
          const roles: string[] = state.accessTokenClaims.realm_access.roles;

          return new UserIdentity(sub, name, username, email, roles);
        })
      );

    const keycloakInitializationPromise = this._keycloak.init();
    const observableKeycloakInitializationResult = fromPromise(keycloakInitializationPromise);

    this._subscriptions.push(
      observableKeycloakInitializationResult
        .pipe(
          map(() => ({
            isUserAuthenticated: this._keycloak.authenticated,
            accessToken: this._keycloak.token,
            accessTokenClaims: this._keycloak.tokenParsed,
            identityTokenClaims: this._keycloak.idTokenParsed
          })),
          tap((initialState: InternalAuthenticationState) => console.log('about to set the initial state', { initialState })),
          tap((initialState: InternalAuthenticationState) => this._internalAuthenticationStateStream.next(initialState)),
          // the Keycloak object already do this during initialization phase
          // but for some reason the hash reappear some time later,
          // doing it again here is just a workaround
          tap((initialState: InternalAuthenticationState) => this.removeEventualFragmentsFromUrl())
        )
        .subscribe()
    );

    this._subscriptions.push(
      this._tokenExpirationStream
        .pipe(
          map((tokenExpirationInSeconds) => tokenExpirationInSeconds * 1000),
          map((tokenExpirationInMilliseconds) => tokenExpirationInMilliseconds - Date.now()),
          map((millisecondsUntilTokenExpiration) => Math.max(0, millisecondsUntilTokenExpiration - 1000)),
          tap((millisecondsUntilTokenExpiration) => console.log('token will be refreshed in about ' + millisecondsUntilTokenExpiration + ' milliseconds')),
          switchMap(timer),
          tap(() => console.log('about to refresh token')),
          switchMap(() => this.refreshToken()),
          map(() => ({
            isUserAuthenticated: this._keycloak.authenticated,
            accessToken: this._keycloak.token,
            accessTokenClaims: this._keycloak.tokenParsed,
            identityTokenClaims: this._keycloak.idTokenParsed
          })),
          tap((newState) => console.log('about to set the new state', { newState })),
          tap((newState) => this._internalAuthenticationStateStream.next(newState))
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
      ._keycloak
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
      ._keycloak
      .logout({ redirectUri: actualReturnUrl });
  }

  public getAuthenticationState(): Observable<AuthenticationState> {
    return this._authenticationStateStream;
  }

  /**
   * @return Observable<boolean> authenticationState true if the user has completed the login procedure and has been authenticated,
   * false otherwise
   */
  public isUserAuthenticated(): Observable<boolean> {
    return this._isUserAuthenticatedStream;
  }

  /**
   * @return Observable<UserIdentity>
   */
  public getUserIdentity(): Observable<UserIdentity> {
    return this._userIdentityStream;
  }

  /**
   * @return Observable<string> accessToken, the encoded bearer authorization token
   * released by Keycloak
   */
  public getAccessToken(): Observable<string> {
    return this._encodedAccessTokenStream;
  }

  /**
   * @return Observable<object> accessTokenClaims, claims contained in the authorization token
   * released by Keycloak
   */
  public getAccessTokenClaims(): Observable<object> {
    return this._accessTokenClaimsStream;
  }

  /**
   * @return Observable<object> identityTokenClaims, claims contained in the identity token
   * released by Keycloak
   */
  public getIdentityTokenClaims(): Observable<object> {
    return this._identityTokenClaimsStream;
  }



  private removeEventualFragmentsFromUrl() {
    const currentUrl = new URL(window.location.href);
    const currentUrlWithoutFragment = currentUrl.origin + currentUrl.pathname;

    window.history.replaceState({}, null, currentUrlWithoutFragment);
  }

  private refreshToken(): Observable<void> {

    const updateTokenPromise: Promise<boolean> = this._keycloak.updateToken(-1);

    return fromPromise(updateTokenPromise)
      .pipe(map((x) => null));
  }



  ngOnDestroy(): void {

    for (const subscription of this._subscriptions)
      subscription.unsubscribe();

  }

}

interface InternalAuthenticationState {
  isUserAuthenticated: boolean;
  accessToken: string;
  accessTokenClaims: any;
  identityTokenClaims: any;
}

export interface AuthenticationState {
  readonly isUserAuthenticated: boolean;
  readonly accessToken: string;
}
