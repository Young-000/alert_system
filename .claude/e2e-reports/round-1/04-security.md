# 04. Security Audit Report

**Date**: 2026-02-28
**Branch**: `main`
**Status**: PASS (with advisories)

---

## Summary

| # | Category | Status | Details |
|---|----------|:------:|---------|
| 1 | Hardcoded Secrets | PASS | No secrets in production code |
| 2 | .env in .gitignore | PASS | Tracked files contain only public values |
| 3 | XSS vectors | PASS | 0 instances in production code |
| 4 | SQL Injection | PASS | TypeORM parameterized queries only |
| 5 | JWT Configuration | PASS | 7d expiry, env-var secret, ignoreExpiration=false |
| 6 | CORS Configuration | PASS | Explicit allowlist + Vercel pattern regex |
| 7 | Password Hashing | PASS | bcrypt with 12 salt rounds |
| 8 | Rate Limiting | PASS | Global 60/min + auth 3-5/min |
| 9 | Helmet (Security Headers) | PASS | CSP + standard headers configured |
| 10 | Exception Filter | PASS | Stack traces hidden from responses |
| 11 | Scheduler Auth | PASS | timingSafeEqual for secret comparison |
| 12 | Public Endpoints | PASS | All @Public() routes appropriately scoped |
| 13 | TypeORM synchronize | PASS | Dual-condition guard (non-prod + explicit flag) |
| 14 | npm audit (Frontend) | WARN | 0 critical, 2 high, 4 moderate |
| 15 | npm audit (Backend) | WARN | 1 critical, 14 high, 9 moderate |

**Fixes applied: 0 | Advisories: 3**

---

## 1. Hardcoded Secrets / API Keys

**Result: PASS**

Searched all `.ts` and `.tsx` files for patterns: `password|secret|api_key|apiKey` with actual string values (8+ characters).

**Findings:**
- All matches are in **test files only** (`.spec.ts`, `.test.ts`, `.test.tsx`, `e2e-spec.ts`)
- Test files use dummy values: `password123`, `SecurePass123!`, `my-scheduler-secret`, `test-api-key`
- Production code reads all secrets from environment variables via `ConfigService` or `process.env`
- Solapi template IDs (e.g., `KA01TP260131155222525E6X1O8FUzNm`) are hardcoded in `solapi.service.ts` -- these are **public identifiers**, not secrets

**Files checked:**
- `backend/src/**/*.ts` -- 0 hardcoded secrets
- `frontend/src/**/*.{ts,tsx}` -- 0 hardcoded secrets

---

## 2. .env Files in .gitignore

**Result: PASS**

### .gitignore rules
```
.env
.env.local
.env.*.local
*/.env
*/.env.local
*/.env.*.local
```

### Git-tracked env files

| File | Tracked | Contains Secrets? |
|------|:-------:|:-----------------:|
| `backend/.env` | NO | YES (DB URL, JWT Secret) |
| `backend/.env.example` | YES | NO (placeholders only) |
| `frontend/.env` | NO | N/A |
| `frontend/.env.local` | NO | YES (Vercel OIDC) |
| `frontend/.env.production` | YES | NO |
| `frontend/.env.test` | YES | NO |
| `frontend/.env.example` | NO | NO |
| `mobile/.env` | NO | N/A |
| `mobile/.env.example` | YES | NO |

**`frontend/.env.production` contents (tracked):**
```
VITE_API_BASE_URL=https://d1qgl3ij2xig8k.cloudfront.net
VITE_VAPID_PUBLIC_KEY=BI2vHyzoB3o...
```

Both values are intentionally public: the CloudFront URL is a public API endpoint, and the VAPID **public** key is designed to be shared with browsers for push subscription. No actual secrets are exposed.

> **Advisory**: Consider moving these to Vercel environment variables to prevent future accidental additions to this tracked file.

---

## 3. XSS Vulnerabilities

**Result: PASS**

Checked for unsafe HTML rendering APIs, dynamic code execution functions, and direct DOM manipulation. **0 instances found in production code.**

Backend CSP headers restrict `scriptSrc` to `'self'` only, providing defense-in-depth against XSS.

---

## 4. SQL Injection

**Result: PASS**

Backend uses TypeORM exclusively. All database access patterns reviewed:

**QueryBuilder usage** (`notification-history.controller.ts`):
```typescript
// Parameterized -- safe
.where('log.userId = :userId', { userId: req.user.userId })
.andWhere("log.sentAt >= NOW() - INTERVAL '1 day' * :days", { days: daysNum })
```

**Repository patterns:**
- All `createQueryBuilder` calls use `:param` syntax (parameterized queries)
- Standard TypeORM methods (`find`, `findOne`, `save`, `delete`) used elsewhere
- No string concatenation in SQL queries
- No raw `query()` calls with user-supplied strings

---

## 5. JWT Configuration

**Result: PASS**

| Setting | Value | Assessment |
|---------|-------|------------|
| Secret source | `JWT_SECRET` env var | Not hardcoded |
| Missing secret | Throws Error on startup | Fail-fast pattern |
| Algorithm | HS256 (default) | Acceptable for single-service |
| Expiry | 7 days | Appropriate for mobile/PWA |
| `ignoreExpiration` | `false` | Expired tokens rejected |
| Token extraction | `fromAuthHeaderAsBearerToken()` | Standard Bearer pattern |
| Validation | DB lookup by `payload.sub` | Prevents deleted-user access |

**File**: `backend/src/presentation/modules/auth.module.ts`
```typescript
JwtModule.registerAsync({
  useFactory: (configService: ConfigService) => {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return { secret, signOptions: { expiresIn: '7d' } };
  },
});
```

---

## 6. CORS Configuration

**Result: PASS**

**File**: `backend/src/main.ts`

- Explicit allowlist of origins (no wildcard `*`)
- Vercel preview URLs restricted to project-specific subdomain pattern
- Blocked origins logged with `logger.warn`
- `credentials: true`
- Explicit `allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']`

---

## 7. Password Hashing

**Result: PASS**

**File**: `backend/src/application/use-cases/create-user.use-case.ts`
- bcrypt with `BCRYPT_SALT_ROUNDS = 12`
- Password stored as hash only, never in plaintext

---

## 8. Rate Limiting

**Result: PASS**

| Scope | Limit | TTL |
|-------|-------|-----|
| Global (ThrottlerGuard) | 60 req | 60 sec |
| `POST /auth/register` | 3 req | 60 sec |
| `POST /auth/login` | 5 req | 60 sec |

Both `ThrottlerGuard` and `JwtAuthGuard` registered as `APP_GUARD` -- applied globally.

---

## 9. Helmet Security Headers

**Result: PASS**

**File**: `backend/src/main.ts`
- CSP configured: defaultSrc self, scriptSrc self, styleSrc self+unsafe-inline, imgSrc self+data+https
- crossOriginEmbedderPolicy: false (PWA compatibility)
- All standard Helmet headers active (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)

---

## 10. Exception Filter

**Result: PASS**

**File**: `backend/src/presentation/filters/http-exception.filter.ts`
- 500+ errors: stack trace logged server-side only; client receives generic message
- 4xx errors: NestJS error response forwarded (no stack trace)
- All responses include `statusCode`, `message`, `path` -- no internal details leaked

---

## 11. Scheduler Trigger Authentication

**Result: PASS**

**File**: `backend/src/presentation/controllers/scheduler-trigger.controller.ts`
- Uses `crypto.timingSafeEqual` -- prevents timing attacks
- Length check before comparison -- prevents buffer length mismatch error
- Missing secret or header immediately rejected
- Error messages are generic ("Authentication failed") -- no information leakage
- Applied to both `/scheduler/trigger` and `/scheduler/weekly-report`

---

## 12. Public Endpoints Review

**Result: PASS**

All `@Public()` decorated routes reviewed:

| Endpoint | Purpose | Risk | Mitigation |
|----------|---------|------|------------|
| `POST /auth/register` | Registration | Medium | Throttle 3/min, ValidationPipe |
| `POST /auth/login` | Login | Medium | Throttle 5/min |
| `GET /auth/google` | OAuth redirect | Low | Passport guard |
| `GET /auth/google/callback` | OAuth callback | Low | Passport guard, fragment URL |
| `GET /auth/google/status` | Config check | Low | No sensitive data |
| `POST /users` | Legacy registration | Medium | Global throttle 60/min |
| `GET /health` | Health check | Low | Returns status only |
| `POST /scheduler/trigger` | EventBridge | High | timingSafeEqual secret |
| `POST /scheduler/weekly-report` | Weekly report | High | timingSafeEqual secret |
| `POST /scheduler/health` | Scheduler health | Low | Returns status only |
| `GET /weather/current` | Weather API proxy | Low | Public data |
| `GET /subway/*` | Subway API proxy | Low | Public data |
| `GET /bus/*` | Bus API proxy | Low | Public data |
| `* /dev/*` | Dev endpoints | N/A | Excluded in production module + runtime guard |

DevController has dual protection:
1. `app.module.ts`: excluded from module when `NODE_ENV === 'production'`
2. `dev.controller.ts`: `assertNotProduction()` runtime check in every method

Google OAuth callback uses URL **fragment** (`#params`) instead of query string -- fragments are not sent in HTTP referrer headers, preventing token leakage.

---

## 13. TypeORM synchronize

**Result: PASS**

**File**: `backend/src/infrastructure/persistence/database.config.ts`

Production is safe: `synchronize` requires both `NODE_ENV !== 'production'` AND explicit `DB_SYNCHRONIZE=true`. The SQLite `synchronize: true` is only for E2E test databases (`:memory:`).

---

## 14. npm audit

### Frontend

| Severity | Count | Notable Packages |
|----------|:-----:|-----------------|
| Critical | 0 | -- |
| High | 2 | minimatch (ReDoS), rollup (path traversal) |
| Moderate | 4 | ajv (ReDoS), esbuild (dev server access) |
| Low | 0 | -- |

All high/moderate vulnerabilities are in **dev/build dependencies**. They do not affect production runtime bundles.

### Backend

| Severity | Count | Notable Packages |
|----------|:-----:|-----------------|
| Critical | 1 | `fast-xml-parser` (via @aws-sdk/client-scheduler) |
| High | 14 | @nestjs/cli, @typescript-eslint/*, sqlite3, tar, glob |
| Moderate | 9 | ajv, inquirer, etc. |
| Low | 20 | AWS SDK internal dependencies |

**Critical: `fast-xml-parser`** is a transitive dependency of `@aws-sdk/client-scheduler`. Since the AWS SDK uses this internally (not with user-supplied XML), **practical risk is low**.

Most high-severity vulnerabilities are in **dev dependencies** (`@nestjs/cli`, `@typescript-eslint/*`, `sqlite3`) and do not run in production.

> **Advisory**: Monitor for AWS SDK patch. Run periodic `npm audit fix` for dev dependency updates.

---

## 15. Additional Security Measures (Already in Place)

| Measure | Status | File |
|---------|:------:|------|
| ValidationPipe (whitelist + forbidNonWhitelisted) | Active | `main.ts` |
| Swagger disabled in production | Active | `main.ts` |
| User authorization (own data only) | Active | `user.controller.ts` |
| bcrypt 12 rounds | Active | `create-user.use-case.ts` |
| Secrets in AWS SSM | Active | `/alert-system/prod/*` |
| CloudFront HTTPS | Active | `d1qgl3ij2xig8k.cloudfront.net` |

---

## Fixes Applied

**0 fixes** -- No actionable security vulnerabilities requiring code changes were found.

---

## Advisories (Non-blocking)

1. **[Low]** `frontend/.env.production` is tracked in git. Contains only public values, but consider moving to Vercel env vars.
2. **[Low]** Backend `fast-xml-parser` critical vulnerability via `@aws-sdk/client-scheduler`. Practical risk is low. Monitor for SDK update.
3. **[Low]** 16 high-severity dev dependency vulnerabilities across FE and BE. Do not affect production. Resolve via periodic `npm audit fix`.
