import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { APP_CONFIG } from '../../core/app-config.token';
import { getStoredCodeVerifier, clearCodeVerifier } from '../../core/pkce';
import { generateCodeVerifier, generateCodeChallenge, storeCodeVerifier } from '../../core/pkce';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-authorized',
  imports: [RouterLink],
  templateUrl: './authorized.html',
  styleUrl: './authorized.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Authorized implements OnInit {
  private api = inject(ApiService);
  private config = inject(APP_CONFIG);
  private authService = inject(AuthService)

  authCode = signal<string | null>(null);
  tokenResponse = signal<string | null>(null);
  tokenError = signal<string | null>(null);
  exchanging = signal(false);
  redirectUri = signal(this.config.redirectUri);
  idTokenClaims = signal<string | null>(null);
  accessTokenClaims = signal<string | null>(null);
  claims = signal<Record<string, unknown> | null>(null);

  authorities = signal<string[]>([]);
  permissions = signal<string[]>([]);
  scope = signal<string[]>([]);
  userId = signal<string | null>(null);
  roles = signal<string[]>([]);

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') ?? new URLSearchParams(window.location.hash.replace('#', '?')).get('code');
    this.authCode.set(code);

    if (code) {
      this.exchangeCode(code);
    }
  }

  async exchangeCode(code: string): Promise<void> {
    const codeVerifier = getStoredCodeVerifier();
    if (!codeVerifier || !this.config.tokenUri) {
      this.tokenError.set('No code verifier or token URI configured');
      return;
    }

    this.exchanging.set(true);
    this.tokenError.set(null);

    try {
      const data = await this.api.exchangeToken(code, codeVerifier);
      this.tokenResponse.set(JSON.stringify(data, null, 2));

      this.authService.setAuthentication(false);

      if (data['id_token']) {
        const parsed = this.authService.parseJwt(data['id_token'] as string);
        this.idTokenClaims.set(parsed ? JSON.stringify(parsed, null, 2) : 'Failed to decode id_token');
      }

      if (data['access_token']) {
        const parsed = this.authService.parseJwt(data['access_token'] as string);
        this.accessTokenClaims.set(parsed ? JSON.stringify(parsed, null, 2) : 'Failed to decode access_token');
        if (parsed) {
          this.extractClaims(parsed);
          if (!this.roles().includes('ROLE_ADMIN')) {
            clearCodeVerifier();
            this.clearSession();
            return;
          }
          this.authService.markAsAutenticathed(JSON.stringify(data));
        }
      } else if (data['id_token']) {
        const parsed = this.authService.parseJwt(data['id_token'] as string);
        if (parsed) {
          this.extractClaims(parsed);
          if (!this.roles().includes('ROLE_ADMIN')) {
            clearCodeVerifier();
            this.clearSession();
            return;
          }
        }
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        this.tokenError.set(`Token request failed (${err.status}): ${err.error instanceof Object ? JSON.stringify(err.error) : err.error}`);
      } else {
        this.tokenError.set(`Network error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      this.exchanging.set(false);
      clearCodeVerifier();
    }
  }

  private clearSession(): void {
    sessionStorage.clear();

    const authBaseUrl = this.config.authorizeUri?.replace(/\/oauth2\/authorize.*$/, '');
    if (authBaseUrl) {
      window.location.href = `${authBaseUrl}/exit`;
    } else {
      window.location.href = '/';
    }
  }

  async login(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    storeCodeVerifier(codeVerifier);

    const params = new URLSearchParams({
      response_type: this.config.responseType!,
      client_id: this.config.clientId!,
      redirect_uri: this.config.redirectUri!,
      scope: this.config.scope!,
      code_challenge_method: this.config.codeChallengeMethod!,
      code_challenge: codeChallenge,
    });
    window.location.href = `${this.config.authorizeUri}${params.toString()}`;
  }

  private extractClaims(claims: Record<string, unknown>): void {
    const parsed = this.authService.parseClaims(claims);
    this.applyClaims(claims, parsed);
  }

  private applyClaims(claims: Record<string, unknown>, parsed: any): void {
    this.claims.set(claims);
    this.userId.set(parsed.userId);
    this.scope.set(parsed.scope);
    if (parsed.authorities !== null) this.authorities.set(parsed.authorities);
    if (parsed.roles !== null) this.roles.set(parsed.roles);
    if (parsed.permissions !== null) this.permissions.set(parsed.permissions);
  }
}
