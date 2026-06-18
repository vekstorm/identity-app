// src/environments/environment.model.ts
export interface AppEnvironment {
  production: boolean;
  apiUrl: string;
  authorizeUri?: string;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  responseType?: string;
  responseMode?: string;
  codeChallengeMethod?: string;
  codeChallenge?: string;
  codeVerifier?: string;
}
