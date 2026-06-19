import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { getStoredCodeVerifier, clearCodeVerifier } from '../../core/pkce';
import { generateCodeVerifier, generateCodeChallenge, storeCodeVerifier } from '../../core/pkce';

@Component({
  selector: 'app-authorized',
  imports: [RouterLink],
  templateUrl: './authorized.html',
  styleUrl: './authorized.scss',
})
export class Authorized implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  authCode: string | null = null;
  tokenResponse: string | null = null;
  tokenError: string | null = null;
  exchanging = false;
  redirectUri = environment.redirectUri;

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    this.authCode = params.get('code');

    if (!this.authCode) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      this.authCode = hashParams.get('code');
    }

    if (this.authCode) {
      this.exchangeCode(this.authCode);
    }
  }

  async exchangeCode(code: string): Promise<void> {
    const codeVerifier = getStoredCodeVerifier();
    if (!codeVerifier || !environment.tokenUri) {
      this.tokenError = 'No code verifier or token URI configured';
      return;
    }

    this.exchanging = true;
    this.tokenError = null;

    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: environment.redirectUri!,
        client_id: environment.clientId!,
        code_verifier: codeVerifier,
      });

      const response = await fetch(environment.tokenUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.tokenError = `Token request failed (${response.status}): ${errorBody}`;
      } else {
        this.tokenResponse = JSON.stringify(await response.json(), null, 2);
      }
    } catch (err) {
      this.tokenError = `Network error: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      this.exchanging = false;
      clearCodeVerifier();
      this.cdr.detectChanges();
      window.location.href = '';
    }
  }

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
