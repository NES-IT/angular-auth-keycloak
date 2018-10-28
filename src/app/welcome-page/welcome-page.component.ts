import { Component, OnInit } from '@angular/core';
import {KeycloakService} from '../../../projects/angular-auth-keycloak/src/lib/keycloak.service';
import {UserIdentity} from '../../../projects/angular-auth-keycloak/src/lib/user-identity.model';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-welcome-page',
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.css']
})
export class WelcomePageComponent implements OnInit {

  constructor(private keycloakService: KeycloakService) { }

  ngOnInit() {
  }

  getAccessToken(): Observable<string> {
    return this.keycloakService.getAccessToken();
  }

  getUserIdentity(): Observable<UserIdentity> {
    return this.keycloakService.getUserIdentity();
  }

  login(): void {
    this.keycloakService.login();
  }

  logout(): void {
    this.keycloakService.logout();
  }

}
