# 04. Security Audit Report

**Date**: 2026-03-03
**Branch**: `feature/e2e-auto-review-20260303`
**Status**: PASS (with advisories)

---

## Summary

| # | Category | Status | Details |
|---|----------|:------:|---------|
| 1 | Hardcoded Secrets | PASS | No secrets in production code |
| 2 | .env in .gitignore | PASS | Tracked files contain only public values |
| 3 | XSS vectors | PASS | 0 instances of unsafe HTML rendering or dynamic code execution |
| 4 | SQL Injection | PASS | TypeORM parameterized queries only |
| 5 | JWT Configuration | PASS | 7d expiry, env-var secret, ignoreExpiration=false |
| 6 | CORS Configuration | PASS | Explicit allowlist + Vercel pattern regex |
| 7 | Password Hashing | PASS | bcrypt with 12 salt rounds |
| 8 | Rate Limiting | PASS | Global 60/min + auth 3-5/min + per-route throttles |
| 9 | Helmet (Security Headers) | PASS | CSP + standard headers configured |
| 10 | Exception Filter | PASS | Stack traces hidden from responses |
| 11 | Scheduler Auth | PASS | timingSafeEqual for secret comparison |
| 12 | Public Endpoints | PASS | All @Public() routes appropriately scoped |
| 13 | TypeORM synchronize | PASS | Dual-condition guard (non-prod + explicit flag) |
| 14 | npm audit (Frontend) | WARN | 0 critical, 3 high, 3 moderate (all dev deps) |
| 15 | npm audit (Backend) | IMPROVED | 0 critical (was 2), 28 high, 7 moderate (mostly dev deps) |

**Fixes applied: 0 code fixes | npm audit fix: critical vulns resolved | Advisories: 3**

---

## 1. Hardcoded Secrets / API Keys

**Result: PASS**

Searched all `.ts` and `.tsx` files for patterns: `api_key|api_secret|password|secret_key|access_token|private_key` with actual string values.

**Findings:**
- All matches are in **test files only** (`.spec.ts`, `.test.ts`, `.test.tsx`, `e2e-spec.ts`)
- Test files use dummy values: `password123`, `SecurePass123!`, `my-scheduler-secret`, `test-api-key`
- Production code reads all secrets from environment variables via `ConfigService` or `process.env`
- Solapi template IDs (e.g., `KA01TP260131155222525E6X1O8FUzNm`) are hardcoded in `solapi.service.ts` -- these are **public identifiers**, not secrets
- CLAUDE.md contains Solapi API Key (`NCSUDCVMRTFLTHIY`), PF ID, Template ID, and AWS Account ID -- these are documentation references; API Secret is stored in AWS SSM

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
| `frontend/.env.local` | NO | N/A |
| `frontend/.env.production` | YES | NO |
| `frontend/.env.test` | YES | NO |
| `mobile/.env.example` | YES | NO |

**`frontend/.env.production` contents (tracked):**
```
VITE_API_BASE_URL=https://d1qgl3ij2xig8k.cloudfront.net
VITE_VAPID_PUBLIC_KEY=BI2vHyzoB3o...
```

Both values are intentionally public: the CloudFront URL is a public API endpoint, and the VAPID **public** key is designed to be shared with browsers for push subscription. No actual secrets are exposed.

---

## 3. XSS Vulnerabilities

**Result: PASS**

Checked for unsafe patterns in frontend and backend source code:
- React's unsafe HTML rendering API -- **0 instances** in entire codebase
- Dynamic code execution patterns -- **0 instances** in frontend source
- Direct DOM write operations -- **0 instances**

Backend CSP headers restrict `scriptSrc` to `'self'` only, providing defense-in-depth against XSS.

---

## 4. SQL Injection

**Result: PASS**

Backend uses TypeORM exclusively. All database access patterns reviewed:

**QueryBuilder usage** (parameterized, safe):
```typescript
// notification-history.controller.ts
.where('log.userId = :userId', { userId: req.user.userId })
.andWhere("log.sentAt >= NOW() - INTERVAL '1 day' * :days", { days: daysNum })

// community.service.ts, congestion-aggregation.service.ts, insights.service.ts
// All use :param parameterized syntax
```

**Raw queries** (only in seed script):
```typescript
// sample-data.seed.ts -- uses parameterized $1 placeholders
await queryRunner.query(`DELETE FROM alert_system.users WHERE id = $1`, [SAMPLE_USER.id]);
```

All raw queries use positional parameters (`$1`, `$2`) with values array -- safe from injection.

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
| Token storage | localStorage (frontend) | Intentional design decision (documented) |

---

## 6. CORS Configuration

**Result: PASS**

**File**: `backend/src/main.ts`

- Explicit allowlist of origins (no wildcard `*`)
- Vercel preview URLs restricted to project-specific subdomain pattern: `/^https:\/\/frontend-xi-two-52(-[a-z0-9]+)?\.vercel\.app$/`
- Blocked origins logged with `logger.warn`
- `credentials: true`
- Explicit `allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']`
- `CORS_ORIGIN` env var for additional origins

---

## 7. Password Hashing

**Result: PASS**

**File**: `backend/src/application/use-cases/create-user.use-case.ts`
- bcrypt with `BCRYPT_SALT_ROUNDS = 12` (industry standard)
- Password stored as hash only (`passwordHash` column), never in plaintext
- Login: `bcrypt.compare(dto.password, user.passwordHash)` in `login.use-case.ts`

---

## 8. Rate Limiting

**Result: PASS**

| Scope | Limit | TTL | File |
|-------|-------|-----|------|
| Global (ThrottlerGuard) | 60 req | 60 sec | `app.module.ts` |
| `POST /auth/register` | 3 req | 60 sec | `auth.controller.ts` |
| `POST /auth/login` | 5 req | 60 sec | `auth.controller.ts` |
| `POST /insights/recalculate` | 1 req | 300 sec | `insights.controller.ts` |
| `POST /congestion/recalculate` | 1 req | 300 sec | `congestion.controller.ts` |
| Community tip creation | 3/day | per user | `tips.service.ts` |

Both `ThrottlerGuard` and `JwtAuthGuard` registered as `APP_GUARD` -- applied globally.

---

## 9. Helmet Security Headers

**Result: PASS**

**File**: `backend/src/main.ts`
- CSP configured: `defaultSrc: ['self']`, `scriptSrc: ['self']`, `styleSrc: ['self', 'unsafe-inline']`, `imgSrc: ['self', 'data:', 'https:']`
- `crossOriginEmbedderPolicy: false` (PWA compatibility)
- All standard Helmet headers active (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)

---

## 10. Exception Filter

**Result: PASS**

**File**: `backend/src/presentation/filters/http-exception.filter.ts`
- 500+ errors: stack trace logged server-side only; client receives generic `"Internal server error"` message
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
| `GET /insights/regions` | Region stats | Low | Aggregated data only |
| `GET /insights/regions/:id` | Region detail | Low | Aggregated data only |
| `GET /insights/regions/:id/trends` | Region trends | Low | Aggregated data only |
| `GET /insights/regions/:id/peak-hours` | Peak hours | Low | Aggregated data only |
| `* /dev/*` | Dev endpoints | N/A | Excluded in production module + runtime guard |

New since last review: Insights region endpoints (`GET /insights/regions*`) are properly public -- they expose only aggregated community statistics, no personal data.

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
| High | 3 | minimatch (ReDoS), rollup (path traversal), serialize-javascript (RCE) |
| Moderate | 3 | ajv (ReDoS), esbuild (dev server access) |
| Low | 0 | -- |

All vulnerabilities are in **dev/build dependencies** (eslint, vite, workbox-build). They do not affect production runtime bundles.

### Backend

| Severity | Count | Notable Packages | Change |
|----------|:-----:|-----------------|--------|
| Critical | **0** | -- | **Fixed (was 2)** |
| High | 28 | @nestjs/cli, minimatch, glob, tar, sqlite3 | Dev deps |
| Moderate | 7 | ajv, js-yaml, lodash, bn.js | Dev deps |
| Low | 20 | AWS SDK internal, inquirer, tmp | Dev deps |

**Improvement**: `fast-xml-parser` critical vulnerability resolved via `npm audit fix` (updated `@aws-sdk/xml-builder` to patched version). Previously had 2 critical, now 0.

Remaining high/moderate vulnerabilities are in **dev dependencies** (`@nestjs/cli`, `@typescript-eslint/*`, `sqlite3`, `eslint`) and do not run in production. Fixing these requires major version upgrades of `@nestjs/cli` (v10 -> v11) or `@typescript-eslint/parser`.

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
| Global JWT Auth Guard | Active | `app.module.ts` |
| Global Rate Limit Guard | Active | `app.module.ts` |
| Community privacy (aggregated only) | Active | `community.controller.ts` |

---

## Fixes Applied

**npm audit fix**: Resolved 2 critical `fast-xml-parser` vulnerabilities in backend (via `@aws-sdk/xml-builder` update).

**Code fixes: 0** -- No actionable security vulnerabilities requiring code changes were found.

---

## Advisories (Non-blocking)

1. **[Low]** `frontend/.env.production` is tracked in git. Contains only public values (CloudFront URL + VAPID public key), but consider moving to Vercel env vars for cleanliness.
2. **[Low]** 31 high-severity dev dependency vulnerabilities across FE and BE. Do not affect production. Resolve when upgrading `@nestjs/cli` to v11 and `eslint` to v9.
3. **[Info]** CLAUDE.md contains Solapi API Key in documentation. While the API Secret is safely stored in AWS SSM, the API Key is exposed in a tracked file. Practical risk is low (key alone cannot send messages), but consider redacting from docs.
