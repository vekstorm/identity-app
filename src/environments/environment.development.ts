import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  apiUrl: 'http://localhost:9000',
  authorizeUri: 'http://localhost:9000/oauth2/authorize?',
  tokenUri: 'http://localhost:9000/oauth2/token',
  clientId: 'identity-client',
  clientSecret: 'identity-secret',
  redirectUri: 'http://localhost:4200/authorized',
  scope: 'openid profile offline_access',
  responseType: 'code',
  responseMode: 'form_post',
  codeChallengeMethod: 'S256',
  codeChallenge: '',
  codeVerifier: ''
};
