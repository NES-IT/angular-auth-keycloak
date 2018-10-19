import { Inject, Injectable, OnDestroy } from '@angular/core';
import { Configuration, CONFIGURATION_INJECTION_TOKEN } from './config.model';
import {BehaviorSubject, Observable, Subject, Subscription, timer} from 'rxjs';
import {filter, map, retry, switchMap, tap} from 'rxjs/operators';
import { fromPromise } from 'rxjs/internal-compatibility';

// import (kinda) global variable
declare var Keycloak: any;

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
  private readonly encodedTokenStream: Observable<string>;
  private readonly tokenExpirationStream: Observable<number>;

  /**
   * @param configuration The configuration of the service behavior
   */
  constructor(@Inject(CONFIGURATION_INJECTION_TOKEN) configuration: Configuration) {
    this.keycloak = Keycloak(configuration.oidcSettings);

    this.subscriptions = [];
    this.internalAuthenticationStateStream = new BehaviorSubject<InternalAuthenticationState>(undefined);
    this.authenticationStateStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state),
        map((state) => state.isUserAuthenticated)
      );
    this.encodedTokenStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.encodedToken)
      );
    this.tokenExpirationStream = this.internalAuthenticationStateStream
      .pipe(
        filter((state) => !!state && state.isUserAuthenticated),
        map((state) => state.claims.exp)
      );

    const initOptions = this.getInitOptions(configuration);
    const keycloakInitializationPromise = this.keycloak.init(initOptions);

    this.subscriptions.push(
      fromPromise(keycloakInitializationPromise)
        .pipe(
          map(() => ({
            isUserAuthenticated: this.keycloak.authenticated,
            encodedToken: this.keycloak.token,
            claims: this.keycloak.tokenParsed
          })),
          tap((initialState) => console.log('about to set the initial state', { initialState })),
          tap((initialState) => this.internalAuthenticationStateStream.next(initialState)),
          // the Keycloak object already do this during initialization phase
          // but for some reason the hash reappear some time later,
          // doing it again here is just a workaround
          tap(() => this.removeEventualFragmentsFromUrl()),
        )
        .subscribe()
    );

    if (configuration.automaticallyRefreshToken)
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
              encodedToken: this.keycloak.token,
              claims: this.keycloak.tokenParsed
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
   * to returnURL.
   *
   * @param returnURL the URL to be redirected at by Keycloak server
   * after the login.
   */
  public login(returnURL) {
    console.log('initiating login', { returnURL });

    this
      .keycloak
      .login({ redirectUri: returnURL });
  }

  /**
   * Load Keycloak server logout page.
   *
   * After the logout procedure has been completed,
   * if automaticallyAuthenticateUserAtStartup option is enabled
   * Keycloak server will redirect the user to the login page,
   * otherwise the user will be redirected to returnURL.
   *
   * @param returnURL the URL to be redirected at by Keycloak server
   * after the login.
   */
  public logout(returnURL) {
    console.log('initiating logout', { returnURL });

    this
      .keycloak
      .logout({ redirectUri: returnURL });
  }

  /**
   * @return Observable<boolean> authenticationState true if the user has completed the login procedure and has been authenticated,
   * false otherwise
   */
  public isUserAuthenticated(): Observable<boolean> {
    return this.authenticationStateStream;
  }

  /**
   * @return Observable<string> encodedToken the bearer authorization token
   * released by Keycloak
   */
  public getToken(): Observable<string> {
    return this.encodedTokenStream;
  }



  private getInitOptions(configuration: Configuration) {
    return configuration.automaticallyAuthenticateUserAtStartup
      ? { onLoad: 'login-required' } // automatic redirect to keycloak login page
      : null;
  }

  private removeEventualFragmentsFromUrl() {
    const currentURL = new URL(window.location.href);
    const currentURLwithoutFragment = currentURL.origin + currentURL.pathname;

    window.history.replaceState({}, null, currentURLwithoutFragment);
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
  encodedToken: string;
  claims: Claims;
}

interface Claims {

  readonly exp: number;

}
