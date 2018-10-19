import { Component } from '@angular/core';
import {KeycloakService} from '../../projects/angular-auth-keycloak/src/lib/keycloak.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'angular-auth';

  constructor(auth: KeycloakService) {
  }

}
