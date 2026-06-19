import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { generateCodeVerifier, generateCodeChallenge, storeCodeVerifier } from '../../core/pkce';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  authorizeUri = environment.authorizeUri?.replace('?', '');
  redirectUri = environment.redirectUri;
  clientId = environment.clientId;
  scope = environment.scope;
  responseType = environment.responseType;
  codeChallengeMethod = environment.codeChallengeMethod;

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
}
