# Security Audit Report - Round 6

**Date**: 2026-03-04
**Project**: alert_system (frontend + backend)
**Scope**: Secrets, .env, XSS, injection, CORS, JWT, Helmet/CSP, rate limiting, validation pipes
**Reviewer**: Claude Opus 4.6

---

## 1. Hardcoded Secrets

### Status: PASS

- All API keys, JWT secrets, DB credentials, Solapi secrets loaded from environment variables via `ConfigService.get()`.
- JWT secret validated at startup with null-check (throws Error if missing).
- Scheduler secret validated with null-check before `timingSafeEqual`.
- Test files contain only mock/fixture values -- acceptable for test context.
- No AWS access keys (AKIA pattern), GitHub tokens (ghp_ pattern), or real API secrets found in source files.
- `backend/.env.example` contains only placeholder values.

**Files verified**:
- `backend/src/infrastructure/auth/jwt.strategy.ts` -- JWT_SECRET from ConfigService
- `backend/src/presentation/modules/auth.module.ts` -- JWT_SECRET from ConfigService
- `backend/src/presentation/controllers/scheduler-trigger.controller.ts` -- SCHEDULER_SECRET from ConfigService

---

## 2. .env File Exposure

### Status: PASS

**Git tracking status**:
| File | Tracked | Contains Secrets | Risk |
|------|---------|-----------------|------|
| `backend/.env` | NOT tracked | YES (DB URL, JWT secret, API keys) | Safe (gitignored) |
| `backend/.env.example` | TRACKED | Placeholder values only | Safe |
| `frontend/.env.production` | TRACKED | No secrets (CloudFront URL + VAPID **public** key only) | Safe |
| `frontend/.env.test` | TRACKED | No secrets (localhost URL + test VAPID key) | Safe |
| `frontend/.env.example` | TRACKED | Placeholder values only | Safe |
| `mobile/.env.example` | TRACKED | Placeholder values only | Safe |

**.gitignore coverage**: Root `.gitignore` covers `.env`, `.env.local`, `*/.env`, `*/.env.local`, `*/.env.*.local`.

---

## 3. XSS (Cross-Site Scripting)

### Status: PASS

- No unsafe HTML rendering patterns found in frontend source.
- No unsafe DOM assignment patterns found in frontend source.
- No dynamic code execution calls found in frontend source.
- React JSX default escaping provides baseline XSS protection.
- Backend Helmet CSP active with strict self-only defaults.
- Community tip content is validated server-side (URL pattern blocked, profanity filtered, length-limited).

---

## 4. SQL Injection

### Status: PASS

- TypeORM used for all DB operations -- parameterized queries by default.
- No raw SQL string concatenation with user input found.
- Community tip queries use repository pattern with TypeORM `.find()` / `.count()` methods.
- Seed files use parameterized queries.

---

## 5. CORS Configuration

### Status: PASS

- Explicit allowlist of origins: localhost ports (5173-5178), production Vercel URL, test Vercel URL.
- Dynamic Vercel preview URLs matched via strict regex pattern.
- Rejected origins logged with warning.
- `credentials: true` with proper origin validation (no wildcard `*`).
- Methods and headers explicitly listed.
- `CORS_ORIGIN` env var available for additional origin support.

---

## 6. JWT / Authentication

### Status: PASS

| Check | Status | Detail |
|-------|--------|--------|
| JWT secret from env | PASS | `ConfigService.get('JWT_SECRET')` with null-check throwing Error |
| Token expiration | PASS | `signOptions: { expiresIn: '7d' }` |
| `ignoreExpiration` | PASS | Set to `false` in JwtStrategy |
| User DB validation | PASS | `JwtStrategy.validate()` verifies user exists via repository |
| Global auth guard | PASS | `JwtAuthGuard` as `APP_GUARD` -- all routes protected by default |
| Public routes | PASS | Explicit `@Public()` decorator on appropriate endpoints |
| Token storage | INFO | `localStorage` -- per project architecture decision (documented) |
| Brute force protection | PASS | Register: 3/min, Login: 5/min via `@Throttle` |
| Scheduler auth | PASS | `timingSafeEqual` for constant-time secret comparison |
| Password hashing | PASS | bcrypt with 12 salt rounds |
| Password validation | PASS | `@MinLength(6)`, `@MaxLength(72)` on CreateUserDto |
| Login error messages | PASS | Generic message (no user enumeration) |
| OAuth-only account | PASS | Handled with specific error for passwordless accounts |
| 401 auto-logout | PASS | Frontend clears localStorage on 401 (excluding auth endpoints) |

**Auth guard coverage (new since Round 4)**:
| Controller | Protection |
|------------|-----------|
| CommunityController | Global JWT guard -- all endpoints require auth |
| InsightsController | `@Public()` on read-only regions, auth on `me/comparison` and `recalculate` |
| CongestionController | `@UseGuards(AuthGuard('jwt'))` + auth checks |

---

## 7. Helmet / CSP Configuration

### Status: PASS

- Helmet middleware applied with CSP directives:
  - `defaultSrc: ["'self'"]`, `scriptSrc: ["'self'"]`
  - `styleSrc: ["'self'", "'unsafe-inline'"]` (Tailwind compatibility)
  - `imgSrc: ["'self'", 'data:', 'https:']`
  - `crossOriginEmbedderPolicy: false` (PWA compatibility)
- All default Helmet headers active (X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
- AllExceptionsFilter returns generic message for 500 errors; stack traces logged server-side only.

---

## 8. Rate Limiting

### Status: PASS

| Scope | Limit | Implementation |
|-------|-------|---------------|
| **Global** | 60 req/min | `ThrottlerModule.forRoot` |
| **Register** | 3 req/min | `@Throttle` decorator |
| **Login** | 5 req/min | `@Throttle` decorator |
| **Recalculate** | 1 req/5 min | `@Throttle` decorator |
| **Community tips** | 3/day per user | Application-level check |
| **ThrottlerGuard** | Global | Applied via `APP_GUARD` |

---

## 9. Validation Pipes (NestJS)

### Status: PASS (with advisory)

**Global ValidationPipe** in `main.ts`:
- `whitelist: true` -- strips unknown properties from DTOs
- `forbidNonWhitelisted: true` -- rejects requests with unknown properties
- `transform: true` -- auto type conversion

**DTO validation coverage**:
| DTO | Type | Validators |
|-----|------|-----------|
| `CreateUserDto` | class | `@IsEmail`, `@MinLength(6)`, `@MaxLength(72)`, `@Matches(phone regex)`, nested `LocationDto` |
| `LoginDto` | class | `@IsEmail`, `@MaxLength(254)`, `@MaxLength(72)` |
| `MissionDto` family | class | `@IsString`, `@IsNotEmpty`, `@IsNumber` |
| `PushSubscriptionDto` | class | `@IsString`, `@IsNotEmpty`, nested validators |
| `LiveActivityDto` | class | `@IsString`, `@IsNotEmpty` |
| `CreateTipRequestDto` | **interface** | No class-validator decorators (see advisory) |

**Advisory**: `CreateTipRequestDto` in `backend/src/application/dto/community.dto.ts` is a TypeScript `interface`, not a `class`. The ValidationPipe's `whitelist`/`forbidNonWhitelisted` settings will not apply. Risk is mitigated by domain-level validation (`CommunityTip.validateContent()` for content length, URL blocking, profanity filtering), session count check, daily rate limit, and TypeORM parameterized queries.

**Recommendation**: Convert to `class` with decorators for defense-in-depth.

---

## 10. Additional Security Checks

### 10a. Swagger / API Docs -- PASS

Swagger gated behind `if (process.env.NODE_ENV !== 'production')` in `main.ts`.

### 10b. Dev Controller Protection -- PASS

Triple protection: excluded from prod module, runtime assertion, `@Public()` with no sensitive data.

### 10c. TypeORM Synchronize -- PASS

SQLite (dev/test): `synchronize: true` (acceptable). PostgreSQL: `false` in production.

### 10d. Database Default Credentials -- INFO

Fallback credentials `alert_user`/`alert_password` in `database.config.ts` only used when `DATABASE_URL` is unset (local dev). Not a production risk.

### 10e. Insights Recalculate Access Control -- INFO

`POST /insights/recalculate` requires JWT auth but no admin role check. Mitigated by 1 req/5 min throttle. Low risk (writes aggregated data only).

### 10f. Community Controller Privacy -- PASS

No author info exposed in responses. `TipDto` includes only safe fields.

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
| Helmet / CSP | PASS | 0 |
| Rate Limiting | PASS | 0 |
| Validation Pipes | PASS (advisory) | 0 critical, 1 advisory |
| Swagger | PASS | 0 |
| Dev Controller | PASS | 0 |
| DB Sync | PASS | 0 |

**Total fixes applied this round: 0**

**Advisories (non-blocking)**:
1. `CreateTipRequestDto` should be converted from `interface` to `class` with class-validator decorators for defense-in-depth.
2. `POST /insights/recalculate` lacks admin-only access control (mitigated by throttling).

No critical or high-severity security issues found. All categories pass.
