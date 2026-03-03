# Security Audit Report - Round 3

**Date**: 2026-02-12
**Project**: alert_system (frontend + backend)
**Scope**: Hardcoded secrets, .env exposure, XSS, injection, CORS, JWT, input validation

---

## 1. Hardcoded Secrets

### Status: PASS (no hardcoded secrets in source code)

- All API keys, JWT secrets, DB credentials loaded from environment variables via `process.env` or `ConfigService`.
- Auth modules, external API clients all use `ConfigService.get()` or `process.env.*`.
- Test files contain only mock/fixture passwords -- acceptable for test context.

**Files verified**:
- `/backend/src/infrastructure/auth/jwt.strategy.ts` -- JWT_SECRET from ConfigService
- `/backend/src/presentation/modules/auth.module.ts` -- JWT_SECRET from ConfigService
- `/backend/src/infrastructure/auth/auth.service.ts` -- uses JwtService (injected)
- `/backend/src/presentation/controllers/scheduler-trigger.controller.ts` -- SCHEDULER_SECRET from ConfigService
- All external API clients use `process.env.*` for keys

---

## 2. .env File Exposure

### Status: PASS (with advisory)

**Git tracking status**:
| File | Tracked | Contains Secrets | Risk |
|------|---------|-----------------|------|
| `backend/.env` | NOT tracked | YES (DB URL, JWT secret, Solapi secret, API keys) | Safe |
| `frontend/.env` | NOT tracked | Supabase anon key only (public) | Safe |
| `frontend/.env.local` | NOT tracked | YES (Vercel OIDC token) | Safe |
| `frontend/.env.production` | TRACKED | No secrets (public URLs, VAPID public key) | Safe |
| `backend/.env.example` | TRACKED | Placeholder values only | Safe |

**.gitignore coverage**: All three `.gitignore` files (root, backend, frontend) cover `.env`, `.env.local`, `.env.*.local` patterns.

**Advisory**: `backend/.env` contains real production-grade secrets. Properly gitignored -- ensure they never get committed.

---

## 3. XSS (Cross-Site Scripting)

### Status: PASS

- No unsafe HTML rendering patterns found in the frontend codebase.
- No direct DOM manipulation with untrusted content.
- No dynamic code execution patterns found.
- React's default JSX escaping provides baseline XSS protection.
- Backend uses Helmet with CSP directives (self-only policy for default and script sources).

---

## 4. SQL Injection

### Status: PASS

- **TypeORM ORM layer** used for all standard queries -- parameterized by default.
- `createQueryBuilder` usage uses TypeORM's query builder (parameterized).
- Raw query calls in seed files all use **parameterized queries** with `$1` placeholders.
- No raw SQL string concatenation with user input detected.

---

## 5. CORS Configuration

### Status: PASS

- Explicit allowlist of origins (no wildcard `*`).
- Dynamic Vercel preview URL matching via regex pattern.
- Rejected origins are logged with a warning.
- `credentials: true` set with explicit origin checking.
- Allowed methods and headers explicitly specified.

---

## 6. JWT / Authentication

### Status: PASS

| Check | Status | Detail |
|-------|--------|--------|
| JWT secret from env | PASS | `ConfigService.get('JWT_SECRET')` with null check |
| Token expiration | PASS | `signOptions: { expiresIn: '7d' }` |
| `ignoreExpiration` | PASS | Set to `false` |
| User validation on token | PASS | `JwtStrategy.validate()` checks user exists in DB |
| Global auth guard | PASS | `JwtAuthGuard` as `APP_GUARD` -- all routes protected by default |
| Public routes | PASS | Explicit `@Public()` decorator for open endpoints |
| Token storage (frontend) | INFO | `localStorage` -- acceptable per project decision |
| Brute force protection | PASS | Login: 5 req/min, Register: 3 req/min via `@Throttle` |
| Scheduler auth | PASS | `timingSafeEqual` for constant-time comparison |

**Google OAuth note**: Token passed in URL query params during callback redirect. Low-severity concern (standard OAuth pattern). Frontend reads and stores the token immediately, then navigates away.

---

## 7. Input Validation

### Status: PASS

**Backend validation**:
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- DTOs use `class-validator` decorators extensively:
  - `CreateUserDto`: `@IsEmail`, `@MinLength(6)`, `@MaxLength(72)`, `@Matches` for phone
  - `LoginDto`: `@IsEmail`, `@MaxLength(254)`, `@MaxLength(72)` for password
  - `CreateAlertDto`: `@IsNotEmpty`, `@IsString`, custom cron expression validator
  - Location DTOs: `@IsNumber`, `@Min(-90)`, `@Max(90)` for lat/lng

---

## 8. Rate Limiting

### Status: PASS

- Global: 60 requests per minute via `ThrottlerModule.forRoot`.
- Auth: Register 3/min, Login 5/min via `@Throttle`.
- `ThrottlerGuard` applied globally via `APP_GUARD`.

---

## 9. Security Headers

### Status: PASS

- **Helmet** middleware active with CSP and all default security headers.
- Exception filter prevents stack trace leakage to clients.
- 500 errors return generic message; details logged server-side only.

---

## 10. Additional Checks

### 10a. Swagger/API Docs Exposure in Production

**Status: FIXED (1 fix applied)**

**Problem**: Swagger UI (`/api-docs`) was available in all environments including production, exposing the full API schema to potential attackers.

**Fix applied**: Wrapped Swagger setup in `NODE_ENV !== 'production'` check in `/backend/src/main.ts`.

### 10b. Dev Controller Protection -- PASS

Double protection: excluded from module in production + runtime assertion.

### 10c. Password Hashing -- PASS

bcrypt with salt rounds for hashing; `bcrypt.compare` for verification.

### 10d. Error Information Leakage -- PASS

Generic error messages to clients; stack traces logged server-side only.

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
| Security Headers | PASS | 0 |
| Swagger Prod Exposure | FIXED | 1 |

**Total fixes applied: 1**

### Fix Detail

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `backend/src/main.ts` | Swagger `/api-docs` exposed in production | Wrapped in `NODE_ENV !== 'production'` guard, removed unconditional log line |
