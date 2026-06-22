import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _isAuthenticated = signal<boolean>(false);
  private _hasAuthority = signal<boolean>(false);

  isAuthenticated() {
    return this._isAuthenticated();
  }

  hasAuthority(authority: string): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    const parsed = this.parseJwt(token);
    const authorities = parsed?.['authorities'];

    return Array.isArray(authorities) && authorities.includes(authority);
  }

  setAccessToken(access_token: string) {
    localStorage.setItem("ACCESS_TOKEN", access_token);
  }

  setRefreshToken(refresh_token: string) {
    localStorage.setItem("REFRESH_TOKEN", refresh_token);
  }

  getJwt() {
    return {
      "access_token": this.getAccessToken(),
      "refresh_token": this.getRefreshToken()
    };
  }

  getAccessToken(): string | null {
    return localStorage.getItem("ACCESS_TOKEN");
  }

  getRefreshToken(): string | null {
    return localStorage.getItem("REFRESH_TOKEN");
  }

  setAuthentication(isAuthenticated: boolean) {
    this._isAuthenticated.update(() => isAuthenticated);
  }

  markAsAutenticathed(token: string | null) {
    if (!token) return;

    const jwt = JSON.parse(token) as { access_token: string; refresh_token: string };

    this._isAuthenticated.update(() => true);
    this.setAccessToken(jwt.access_token);
    this.setRefreshToken(jwt.refresh_token);
  }

  logout() {
    this._isAuthenticated.update(() => false);
    this._hasAuthority.update(() => false);
    window.location.href = '/'
    localStorage.clear();
    sessionStorage.clear();
  }

  parseClaims(claims: Record<string, unknown>) {
    const c = claims as any;

    // user_id
    const userId = c.user_id ?? c.sub ?? null;

    // scope
    let scope: string[];
    const rawScope = c.scope;
    if (Array.isArray(rawScope)) {
      scope = rawScope.map(String);
    } else if (typeof rawScope === 'string') {
      scope = rawScope.split(/[\s,]+/).filter(Boolean);
    } else {
      scope = [];
    }

    // authorities
    const rawAuthorities = c.authorities;
    const authorities = Array.isArray(rawAuthorities) ? rawAuthorities.map(String) : null;

    // roles
    let roles: string[] | null = null;
    const realmAccess = c.realm_access;
    if (realmAccess?.roles) {
      roles = realmAccess.roles;
    } else if (Array.isArray(c.roles)) {
      roles = c.roles.map(String);
    }

    // permissions
    let permissions: string[] | null = null;
    const resourceAccess = c.resource_access;
    if (resourceAccess) {
      const perms: string[] = [];
      for (const client of Object.values(resourceAccess) as any) {
        if (client.roles) perms.push(...client.roles);
      }
      permissions = [...new Set(perms)];
    } else if (Array.isArray(c.permissions)) {
      permissions = c.permissions.map(String);
    }

    return { userId, scope, authorities, roles, permissions };
  }

  parseJwt(token: string): Record<string, unknown> | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}
