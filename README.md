# Identity App — Vekstorm OAuth2 Client

Cliente Angular que implementa el flujo **Authorization Code + PKCE** para autenticarse contra el Vekstorm Authorization Server. Gestiona el ciclo completo de login, intercambio de código por tokens, renovación de tokens y logout, con soporte para Ionic/Capacitor en dispositivos móviles.

## Propósito

Actuar como **cliente OAuth2** confidencial, redirigiendo al usuario al authorization server, recibiendo el authorization code vía redirect URI, canjeándolo por tokens (`access_token`, `refresh_token`, `id_token`) y almacenándolos localmente. Valida que el usuario tenga el rol `ROLE_ADMIN` para conceder acceso.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework | Angular 22 (standalone components) |
| Lenguaje | TypeScript 6.0 + Node 26 |
| UI | Bootstrap 5.3 + SCSS |
| Mobile | Capacitor 8 (Android / iOS) |
| HTTP | `HttpClient` (standalone, sin interceptors) |
| Auth | OAuth2 Authorization Code + PKCE + client_secret_basic |
| Testing | Vitest (vía Angular CLI) |
| Build tool | Angular CLI 22 |

## Flujo OAuth2

### Inicio de sesión

1. El usuario hace clic en **Login**
2. `menu.ts` o `home.ts` genera un **code verifier** (32 bytes aleatorios) y su **code challenge** (SHA-256 base64url)
3. Almacena el verifier en `sessionStorage`
4. Redirige al navegador a:

```
http://localhost:9000/oauth2/authorize?
  response_type=code&
  client_id=identity-client&
  redirect_uri=http://localhost:4200/authorized&
  scope=openid+profile+offline_access&
  code_challenge_method=S256&
  code_challenge=<challenge>
```

### Recepción del código

5. El authorization server autentica al usuario, solicita consentimiento y redirige a:

```
http://localhost:4200/authorized?code=<authorization_code>&...
```

6. `authorized.ts:ngOnInit()` extrae el `code` de la URL
7. Llama a `ApiService.exchangeToken(code, codeVerifier)` que hace **POST** a:

```
POST http://localhost:9000/oauth2/token
Authorization: Basic aWRlbnRpdHktY2xpZW50OmlkZW50aXR5LXNlY3JldA==
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<authorization_code>&
redirect_uri=http://localhost:4200/authorized&
client_id=identity-client&
code_verifier=<verifier>
```

### Validación de permisos

8. Si el `access_token` no contiene `ROLE_ADMIN` en sus claims, se deniega el acceso y redirige a `/exit` en el auth server
9. Si tiene `ROLE_ADMIN`, almacena `access_token` y `refresh_token` en `localStorage` y marca la sesión como autenticada

### Renovación de tokens

El `Refresh Token` se usa para obtener nuevos tokens cuando el access token expira. `ApiService.refreshToken()` hace POST a:

```
POST http://localhost:9000/oauth2/token
Authorization: Basic aWRlbnRpdHktY2xpZW50OmlkZW50aXR5LXNlY3JldA==
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=<refresh_token>&
client_id=identity-client
```

## Logout

El método `logout()` en `menu.ts`:

1. Limpia el estado de autenticación y almacenamiento local (`AuthService.logout()`)
2. Redirige al authorization server:

```
GET http://localhost:9000/exit?client_id=identity-client
```

El servidor busca el `postLogoutRedirectUri` del cliente en BD y redirige allí (por defecto a `http://localhost:4200/`).

## Componentes

### `App` (raíz)
Standalone component con `<app-menu>` y `<router-outlet />`.

### `Menu` (`/` — navbar)
Barra de navegación con botón de Login/Logout. Inicia el flujo PKCE al hacer login y redirige a `/exit` al hacer logout.

### `Home` (`/` — landing page)
Página principal que muestra los parámetros de configuración OAuth2 y un botón para iniciar la autorización.

### `Authorized` (`/authorized` — callback OAuth2)
Componente que recibe el `authorization_code` de la redirect URI, lo canjea por tokens y valida el rol `ROLE_ADMIN`. Muestra el token response, los claims parseados (userId, scope, roles, authorities, permissions), y botones para login / clear session.

## Configuración (`environments/`)

### `environment.model.ts` — Interfaz `AppEnvironment`

| Propiedad | Descripción |
|---|---|
| `authorizeUri` | URL del endpoint de autorización |
| `tokenUri` | URL del endpoint de tokens |
| `clientId` | `identity-client` |
| `clientSecret` | `identity-secret` (para Basic Auth) |
| `redirectUri` | `http://localhost:4200/authorized` |
| `scope` | `openid profile offline_access` |
| `responseType` | `code` |
| `codeChallengeMethod` | `S256` |

### `environment.ts` / `environment.development.ts`

Mismos valores para desarrollo y producción:

```typescript
authorizeUri: 'http://localhost:9000/oauth2/authorize?',
tokenUri: 'http://localhost:9000/oauth2/token',
clientId: 'identity-client',
clientSecret: 'identity-secret',
redirectUri: 'http://localhost:4200/authorized',
scope: 'openid profile offline_access',
responseType: 'code',
codeChallengeMethod: 'S256',
```

## Arquitectura

```
main.ts
  └─ bootstrapApplication(App, appConfig)
       ├─ App (standalone root)
       │    ├─ imports: [RouterOutlet, Menu]
       │    └─ providers: provideRouter, provideHttpClient, APP_CONFIG
       │
       ├─ Routes (lazy, standalone):
       │    ├─ ''           → Home
       │    ├─ 'authorized' → Authorized
       │    └─ '**'         → redirect '/'
       │
       ├─ Services (providedIn: 'root'):
       │    ├─ AuthService - estado auth, JWT parse, localStorage
       │    └─ ApiService  - HTTP calls a token endpoint (Basic auth)
       │
       └─ Core:
            ├─ APP_CONFIG injection token
            └─ PKCE utilities (code verifier/challenge)
```

No hay guards de ruta, NgModules, ni interceptores HTTP. El control de acceso se hace imperativamente en `Authorized.exchangeCode()`.

## Desarrollo

```bash
cd apps/identity-app
ng serve
```

Abrir en `http://localhost:4200/`. La app recarga automáticamente con cada cambio.

## Build

```bash
ng build
```

Los artefactos se generan en `dist/`.

## Mobile (Capacitor)

```bash
npm run build
npx cap sync
npx cap open android   # o ios
npx cap run android
```
