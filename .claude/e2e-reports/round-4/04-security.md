# Security Audit Report - Round 4

**Date**: 2026-02-13
**Project**: alert_system (frontend + backend)
**Scope**: Secrets, .env, XSS, injection, CORS, JWT, validation, Swagger
**Reviewer**: Claude Opus 4.6

---

## 1. Hardcoded Secrets

### Status: PASS

- All API keys, JWT secrets, DB credentials, Solapi secrets loaded from environment variables.
- `ConfigService.get()` used consistently in backend for secret access.
- JWT secret validated at startup with null-check (throws Error if missing).
- Test files contain only mock/fixture passwords -- acceptable for test context.
- No AWS access keys (AKIA pattern), GitHub tokens (ghp_ pattern), or OpenAI keys (sk- pattern) found in source.

**Files verified**:
- `backend/src/infrastructure/auth/jwt.strategy.ts` -- JWT_SECRET from ConfigService
- `backend/src/presentation/modules/auth.module.ts` -- JWT_SECRET from ConfigService
- `backend/src/presentation/controllers/scheduler-trigger.controller.ts` -- SCHEDULER_SECRET from ConfigService
- `backend/src/infrastructure/auth/auth.service.ts` -- JwtService injected
- `supabase/config.toml` -- uses `env()` wrapper for all secrets

---

## 2. .env File Exposure

### Status: PASS (with advisory)

**Git tracking status**:
| File | Tracked | Contains Secrets | Risk |
|------|---------|-----------------|------|
| `backend/.env` | NOT tracked | YES (DB URL, JWT secret, Solapi secret, API keys, SERVICE_ROLE_KEY) | Safe (gitignored) |
| `frontend/.env` | NOT tracked | Supabase anon key only (public) | Safe |
| `frontend/.env.local` | NOT tracked | YES (Vercel OIDC token) | Safe (gitignored) |
| `frontend/.env.production` | TRACKED | No secrets (public URLs, VAPID public key only) | Safe |
| `frontend/.env.test` | TRACKED | No secrets (public URLs, VAPID public key only) | Safe |
| `backend/.env.example` | TRACKED | Placeholder values only | Safe |

**.gitignore coverage**: Root `.gitignore` covers `.env`, `.env.local`, `*/.env`, `*/.env.local`, `*/.env.*.local`.

**Advisory**: `backend/.env` contains real credentials (DB password, Solapi API Secret, JWT secret hash). These are properly gitignored. No service role key reaches the frontend.

---

## 3. XSS (Cross-Site Scripting)

### Status: PASS

- No unsafe HTML rendering patterns found in frontend source (searched for innerHTML, dynamic code execution, unsafe React patterns).
- React default JSX escaping provides baseline XSS protection.
- Backend Helmet CSP: `defaultSrc: ["'self'"]`, `scriptSrc: ["'self'"]`, `imgSrc: ["'self'", 'data:', 'https:']`.
- `styleSrc` includes `'unsafe-inline'` -- acceptable for inline styles but could be tightened.

---

## 4. SQL Injection

### Status: PASS

- TypeORM ORM layer used for all DB operations -- parameterized queries by default.
- No raw SQL string concatenation with user input found.
- No `query()` calls with string interpolation detected.
- Seed files use parameterized queries with `$1` placeholders.

---

## 5. CORS Configuration

### Status: PASS

- Explicit allowlist: localhost ports, production Vercel URL, test URL.
- Dynamic Vercel preview URLs matched via strict regex: `/^https:\/\/frontend-[a-z0-9-]+\.vercel\.app$/`.
- Rejected origins logged with warning.
- `credentials: true` with proper origin validation (no wildcard `*`).
- Methods and headers explicitly listed.
- `CORS_ORIGIN` env var for additional flexibility.

---

## 6. JWT / Authentication

### Status: PASS

| Check | Status | Detail |
|-------|--------|--------|
| JWT secret from env | PASS | `ConfigService.get('JWT_SECRET')` with null-check throwing Error |
| Token expiration | PASS | `signOptions: { expiresIn: '7d' }` |
| `ignoreExpiration` | PASS | Set to `false` in JwtStrategy |
| User DB validation | PASS | `JwtStrategy.validate()` checks user exists via repository |
| Global auth guard | PASS | `JwtAuthGuard` as `APP_GUARD` -- all routes protected by default |
| Public routes | PASS | Explicit `@Public()` on: health, weather, bus, subway, auth/register, auth/login, dev, scheduler-trigger |
| Token storage | INFO | `localStorage` -- per project architecture decision |
| Brute force protection | PASS | Register: 3/min, Login: 5/min via `@Throttle` |
| Scheduler auth | PASS | `timingSafeEqual` for constant-time secret comparison (both trigger + legacy) |
| Password hashing | PASS | bcrypt with 12 salt rounds |
| Login error messages | PASS | Generic "email or password incorrect" (no user enumeration) |
| Password-less account | PASS | Handled: "password not set" error for OAuth-only accounts |

**Auth guard coverage**:
| Controller | Protection |
|-----------|-----------|
| AlertController | Global JWT guard + per-method authorization checks |
| UserController | Global JWT guard + `@Public()` on create + authorization checks |
| RouteController | `@UseGuards(AuthGuard('jwt'))` + authorization checks |
| CommuteController | `@UseGuards(AuthGuard('jwt'))` + authorization checks |
| BehaviorController | `@UseGuards(AuthGuard('jwt'))` |
| PrivacyController | `@UseGuards(AuthGuard('jwt'))` + authorization checks |
| NotificationHistoryController | `@UseGuards(AuthGuard('jwt'))` |
| PushController | `@UseGuards(AuthGuard('jwt'))` |
| AnalyticsController | `@UseGuards(AuthGuard('jwt'))` |
| AirQualityController | Global JWT guard (no `@Public()`) + authorization on user endpoint |
| SchedulerTriggerController | `@Public()` + custom secret header validation |
| SchedulerLegacyController | Global JWT guard (no `@Public()`) + custom API key validation |
| HealthController | `@Public()` |
| WeatherController | `@Public()` |
| BusController | `@Public()` |
| SubwayController | `@Public()` |
| DevController | `@Public()` + excluded from prod module + runtime assertion |

**Google OAuth callback**: Token passed in URL query params -- standard OAuth pattern. Frontend `AuthCallbackPage` reads and stores token immediately, then navigates away. `frontendUrl` is from `FRONTEND_URL` env var with localhost fallback (not user-controlled, no open redirect risk).

---

## 7. Input Validation

### Status: PASS

**Global ValidationPipe**:
- `whitelist: true` -- strips unknown properties
- `forbidNonWhitelisted: true` -- rejects requests with unknown properties
- `transform: true` -- auto type conversion

**DTO validation coverage**:
| DTO | Validators |
|-----|-----------|
| `CreateUserDto` | `@IsEmail`, `@MinLength(6)`, `@MaxLength(72)`, `@Matches(phone regex)`, `@MaxLength(50)` for name, nested `LocationDto` |
| `LoginDto` | `@IsEmail`, `@MaxLength(254)`, `@MaxLength(72)` |
| `CreateAlertDto` | `@IsUUID('4')`, `@IsNotEmpty`, custom `CronExpressionValidator`, `@IsIn(ALERT_TYPES)`, `@ArrayMinSize(1)` |
| `UpdateAlertDto` | All optional + proper type validators |
| `LocationQueryDto` | Coordinate validation |
| Commute DTOs | Session/checkpoint/route DTOs validated |
| `RouteRecommendationQueryDto` | Query param validation |

**Frontend validation**: HTML5 form validation (`required`, `minLength`, `pattern`, `maxLength`) on LoginPage inputs.

---

## 8. Rate Limiting

### Status: PASS

- **Global**: 60 req/min via `ThrottlerModule.forRoot`
- **Register**: 3 req/min via `@Throttle({ default: { limit: 3, ttl: 60000 } })`
- **Login**: 5 req/min via `@Throttle({ default: { limit: 5, ttl: 60000 } })`
- `ThrottlerGuard` applied globally via `APP_GUARD`

---

## 9. Swagger / API Docs

### Status: PASS (previously fixed in Round 3)

- Swagger wrapped in `if (process.env.NODE_ENV !== 'production')` guard in `main.ts`.
- Not accessible in production.
- Uses `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators.
- Bearer auth scheme configured.

---

## 10. Security Headers

### Status: PASS

- **Helmet** middleware active with:
  - Content Security Policy (strict self-only defaults)
  - `crossOriginEmbedderPolicy: false` for PWA compatibility
  - All default Helmet headers (X-Frame-Options, X-Content-Type-Options, etc.)
- **AllExceptionsFilter**: 500 errors return generic message; stack traces logged server-side only.

---

## 11. Additional Checks

### 11a. Authorization (Object-level access control) -- PASS

Every protected controller verifies `req.user.userId` matches the requested resource's `userId`. Consistent pattern across all controllers with explicit `ForbiddenException`.

### 11b. Dev Controller Protection -- PASS

Triple protection: (1) excluded from module in production, (2) runtime `assertNotProduction()` check, (3) `@Public()` with no sensitive data exposure.

### 11c. Frontend Token Handling -- PASS

- 401 responses trigger automatic logout (clear all localStorage, redirect to login).
- Auth endpoints excluded from auto-redirect (proper error display).
- Retry logic only on network/timeout errors (not 4xx/5xx).

### 11d. Scheduler Legacy Controller -- PASS

No `@Public()` decorator means global JWT guard protects it. Additionally has its own API key validation with `timingSafeEqual`. Double-protected. Disabled when `AWS_SCHEDULER_ENABLED=true`.

---

## Summary

| Category | Status | Issues |
|----------|--------|--------|
| Hardcoded Secrets | PASS | 0 |
| .env Exposure | PASS | 0 |
| XSS | PASS | 0 |
| SQL Injection | PASS | 0 |
| CORS | PASS | 0 |
| JWT / Auth | PASS | 0 |
| Input Validation | PASS | 0 |
| Rate Limiting | PASS | 0 |
| Swagger | PASS | 0 (fixed in R3) |
| Security Headers | PASS | 0 |
| Authorization | PASS | 0 |

**Total fixes applied this round: 0**

No new security issues found. All categories pass. Round 3 Swagger fix verified intact.
