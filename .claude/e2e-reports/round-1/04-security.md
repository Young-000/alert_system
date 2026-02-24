# Security Review Report

**Date**: 2026-02-24
**Branch**: `feature/e2e-auto-review-20260224`
**Reviewer**: Security Agent

---

## 1. Hardcoded Secrets

### Result: PASS

- **No API keys, passwords, or tokens found hardcoded in source code** (`backend/src/`, `frontend/src/`).
- All sensitive values (JWT_SECRET, SOLAPI_API_SECRET, DATABASE_URL, etc.) are loaded from environment variables via `ConfigService` or `process.env`.
- `.env` files are properly excluded by `.gitignore` at both root and subdirectory levels.
- `backend/.env.example` contains only placeholder values (e.g., `your-jwt-secret`).
- `frontend/.env.production` is tracked in git but contains only:
  - `VITE_API_BASE_URL` -- public CloudFront URL (safe)
  - `VITE_VAPID_PUBLIC_KEY` -- VAPID *public* key, designed to be shared with clients (safe)
- `docker-compose.yml` contains `POSTGRES_PASSWORD: alert_password` -- this is for local development only. Acceptable for local dev; production uses `DATABASE_URL` env var.
- Solapi template IDs are hardcoded in `solapi.service.ts` -- these are public identifiers for Kakao alimtalk templates, not secrets. **Acceptable.**

---

## 2. Authentication & Authorization

### Result: PASS

#### JWT Guard: Global
- `JwtAuthGuard` is registered as `APP_GUARD` in `app.module.ts`. All endpoints require JWT by default.
- The guard correctly checks for `@Public()` decorator and skips authentication only for decorated endpoints.
- `ignoreExpiration: false` in `jwt.strategy.ts` -- tokens are properly expired.
- JWT token expiry: `7d` (set in `auth.module.ts`).

#### @Public() Endpoints Review

| Endpoint | Justification | Risk |
|----------|--------------|------|
| `GET /health` | ALB health check | None |
| `POST /auth/register` | Account creation | Rate limited (3/min) |
| `POST /auth/login` | Authentication | Rate limited (5/min) |
| `GET /auth/google` | OAuth redirect | Google Guard |
| `GET /auth/google/callback` | OAuth callback | Google Guard |
| `GET /auth/google/status` | Config check | Returns boolean only |
| `POST /scheduler/trigger` | EventBridge trigger | Secret header validation (timing-safe) |
| `POST /scheduler/weekly-report` | EventBridge trigger | Secret header validation (timing-safe) |
| `POST /scheduler/health` | EventBridge health | Returns status only |
| `GET /subway/stations` | Station search | Public data |
| `GET /subway/arrival/:name` | Arrival info | Public data |
| `GET /bus/stops` | Stop search | Public data |
| `GET /bus/arrival/:stopId` | Arrival info | Public data |
| `GET /weather/current` | Weather data | Public data |
| `POST /users` | User creation (legacy) | Should deprecate |
| `DevController` (all) | Dev/test endpoints | Module excluded in prod + runtime check |

**All @Public() usages are justified and appropriate.**

#### userId Authorization
- Every user-specific endpoint checks `req.user.userId !== param/dto userId` and throws `ForbiddenException`.
- Comprehensive coverage confirmed across all 22 controller files.

---

## 3. Input Validation

### Result: PASS (with 1 fix applied)

#### Global ValidationPipe: Configured
- `whitelist: true` -- strips unknown properties
- `forbidNonWhitelisted: true` -- rejects unknown properties with error
- `transform: true` -- auto type conversion

#### DTOs with class-validator: 16 files confirmed
All major DTOs use proper decorators: `@IsEmail`, `@IsString`, `@IsNotEmpty`, `@MinLength`, `@MaxLength`, `@Matches`, `@IsUUID`, `@IsNumber`, `@Min`, `@Max`, `@ValidateNested`, `@IsArray`, `@IsEnum`, `@IsOptional`, `@IsBoolean`.

#### Fix Applied: `SchedulerTriggerPayload`
- **Before**: Plain TypeScript `interface` -- `ValidationPipe` cannot validate interfaces.
- **After**: Converted to `class` with `@IsUUID`, `@IsNotEmpty`, `@IsArray`, `@IsString({ each: true })` decorators.
- **File**: `backend/src/presentation/controllers/scheduler-trigger.controller.ts`

---

## 4. XSS / Injection

### Result: PASS

- **No React raw HTML injection** usage anywhere in the frontend codebase.
- **No SQL string concatenation** found. All database queries use:
  - TypeORM repository methods (`find`, `findOne`, `save`, `delete`)
  - Parameterized QueryBuilder (`:userId`, `:days` parameters)
- **No dynamic code execution patterns** found in either frontend or backend.

---

## 5. CORS / Helmet

### Result: PASS

#### CORS Configuration (`main.ts`)
- Explicit whitelist of allowed origins (localhost dev ports + production Vercel URL).
- Vercel preview URLs: Regex pattern properly scoped to project name.
- Blocked origins are logged with `logger.warn`.
- `credentials: true` with explicit method/header whitelist.

#### Helmet CSP (`main.ts`)
- `defaultSrc: ["'self'"]`
- `styleSrc: ["'self'", "'unsafe-inline'"]` (common for CSS-in-JS)
- `scriptSrc: ["'self'"]` -- no unsafe-inline or unsafe scripts allowed
- `imgSrc: ["'self'", 'data:', 'https:']`

---

## 6. Rate Limiting

### Result: PASS

- `ThrottlerModule` configured globally: **60 requests per minute** per IP.
- `ThrottlerGuard` registered as `APP_GUARD`.
- Auth-specific throttling:
  - `POST /auth/register`: 3 requests per minute
  - `POST /auth/login`: 5 requests per minute (brute-force mitigation)

---

## 7. Additional Security Checks

### Password Hashing: PASS
- bcrypt with 12 salt rounds.
- `passwordHash` excluded from API responses via `UserResponseDto.fromEntity()`.

### Token in OAuth Redirect: PASS
- Google OAuth callback uses URL fragment instead of query string to prevent token leakage via server logs/Referer headers.
- Frontend clears the fragment from browser history via `window.history.replaceState`.

### Error Handling: PASS
- `AllExceptionsFilter` catches all exceptions globally.
- Stack traces only logged server-side for 500 errors.
- Client receives generic error messages without implementation details.

### Swagger: PASS
- Only enabled when `NODE_ENV !== 'production'`.

### Dev Controller: PASS
- Only included in `AppModule` when `NODE_ENV !== 'production'`.
- Additional runtime check `assertNotProduction()` in every handler (defense in depth).

### Database Synchronize: PASS
- `synchronize` only enabled when `NODE_ENV !== 'production' && DB_SYNCHRONIZE === 'true'`. Safe.

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Hardcoded secrets | PASS | All secrets via env vars |
| JWT Auth (global) | PASS | APP_GUARD + @Public() appropriate |
| userId authorization | PASS | Checked in every user endpoint |
| Input validation (DTOs) | PASS | 16 DTOs with class-validator |
| SchedulerTriggerPayload | FIXED | Interface -> class DTO with validators |
| XSS prevention | PASS | No raw HTML injection used |
| SQL Injection | PASS | Parameterized queries only |
| Dynamic code execution | PASS | Not used |
| CORS | PASS | Explicit whitelist + Vercel pattern |
| Helmet CSP | PASS | Configured with strict directives |
| Rate Limiting | PASS | Global 60/min + auth-specific limits |
| Password hashing | PASS | bcrypt 12 rounds |
| Error exposure | PASS | Stack traces server-side only |
| .env in git | PASS | .gitignore covers all sensitive files |

### Fixes Applied: 1

1. **`scheduler-trigger.controller.ts`**: Converted `SchedulerTriggerPayload` from a TypeScript `interface` to a `class` with `@IsUUID`, `@IsNotEmpty`, `@IsArray`, `@IsString({ each: true })` decorators so that the global `ValidationPipe` can validate the request body on the scheduler trigger endpoint.

### Advisories (No fix needed)

- **JWT expiry 7d**: Consider shorter expiry (e.g., 1d) with refresh token rotation for higher security. Current setup is acceptable for the app's threat model.
- **`POST /users` @Public()**: Legacy user creation endpoint without rate limiting. Consider adding `@Throttle()` or deprecating in favor of `POST /auth/register` which has rate limiting.
- **localStorage for token storage**: Tokens stored in `localStorage` are accessible to any JavaScript running on the page. Consider `httpOnly` cookies for higher-security scenarios. Acceptable for current PWA architecture.
