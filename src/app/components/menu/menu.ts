import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { generateCodeVerifier, generateCodeChallenge, storeCodeVerifier } from '../../core/pkce';

@Component({
  selector: 'app-menu',
  imports: [RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu {
  async login(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    storeCodeVerifier(codeVerifier);

    const params = new URLSearchParams({
      response_type: environment.responseType!,
      client_id: environment.clientId!,
      redirect_uri: environment.redirectUri!,
      scope: environment.scope!,
      code_challenge_method: environment.codeChallengeMethod!,
      code_challenge: codeChallenge,
    });
    window.location.href = `${environment.authorizeUri}${params.toString()}`;
  }

  logout(): void {
    window.location.href = environment.apiUrl + "/login?logout";
  }
}
