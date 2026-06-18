import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  apiUrl: 'https://api.midominio.com',
  authorizeUri: 'https://localhost:9000/oauth2/authorize?',
  clientId: 'identity-client',
  redirectUri: 'https://127.0.0.1:4200/authorized',
  scope: 'openid profile',
  responseType: 'code',
  responseMode: 'form_post',
  codeChallengeMethod: 'S256',
  codeChallenge: '0j8RMI0Mr-3HCyjiaGFMxIOayuq5PFKAfKEYWq5k_CA',
  codeVerifier: 'GNLnSzLOUBouRx16eYjNxMDctD9g6q7nGFI0h787pkb'
};
