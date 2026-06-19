import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { APP_CONFIG } from '../../core/app-config.token';
import { getStoredCodeVerifier, clearCodeVerifier } from '../../core/pkce';
import { generateCodeVerifier, generateCodeChallenge, storeCodeVerifier } from '../../core/pkce';
import { ApiService } from '../../services/api.service';

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

  private parseJwt(token: string): Record<string, unknown> | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private extractClaims(claims: Record<string, unknown>): void {
    this.claims.set(claims);

    // user_id (prefer user_id field, fallback to sub)
    this.userId.set((claims as any).user_id ?? (claims as any).sub ?? null);

    // scope (array or space-separated string)
    const rawScope = (claims as any).scope;
    if (Array.isArray(rawScope)) {
      this.scope.set(rawScope.map(String));
    } else if (typeof rawScope === 'string') {
      this.scope.set(rawScope.split(/[\s,]+/).filter(Boolean));
    } else {
      this.scope.set([]);
    }

    // authorities
    const rawAuthorities = (claims as any).authorities;
    if (Array.isArray(rawAuthorities)) {
      this.authorities.set(rawAuthorities.map(String));
    }

    // roles (from realm_access.roles or top-level roles)
    const realmAccess = (claims as any).realm_access;
    if (realmAccess?.roles) {
      this.roles.set(realmAccess.roles);
    } else if (Array.isArray((claims as any).roles)) {
      this.roles.set((claims as any).roles.map(String));
    }

    // permissions (from resource_access or top-level permissions)
    const resourceAccess = (claims as any).resource_access;
    if (resourceAccess) {
      const perms: string[] = [];
      for (const client of Object.values(resourceAccess) as any) {
        if (client.roles) perms.push(...client.roles);
      }
      this.permissions.set([...new Set(perms)]);
    } else if (Array.isArray((claims as any).permissions)) {
      this.permissions.set((claims as any).permissions.map(String));
    }
  }

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

      if (data['id_token']) {
        const parsed = this.parseJwt(data['id_token'] as string);
        this.idTokenClaims.set(parsed ? JSON.stringify(parsed, null, 2) : 'Failed to decode id_token');
      }

      if (data['access_token']) {
        const parsed = this.parseJwt(data['access_token'] as string);
        this.accessTokenClaims.set(parsed ? JSON.stringify(parsed, null, 2) : 'Failed to decode access_token');
        if (parsed) {
          this.extractClaims(parsed);
          if (!this.roles().includes('ROLE_ADMIN')) {
            clearCodeVerifier();
            this.clearSession();
            return;
          }
        }
      } else if (data['id_token']) {
        const parsed = this.parseJwt(data['id_token'] as string);
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

    // // Redirect to auth server logout to clear session cookie
    // const authBaseUrl = this.config.authorizeUri?.replace(/\/oauth2\/authorize.*$/, '');
    // if (authBaseUrl) {
    //   window.location.href = `${authBaseUrl}/login?logout`;
    // } else {
    //   window.location.href = '/';
    // }
    window.location.href = '/';
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
}
