# 04. Security Audit Report

**Date**: 2026-03-14
**Branch**: `feature/e2e-auto-review-20260314`
**Status**: PASS (with advisories)

---

## Summary

| # | Category | Status | Details |
|---|----------|:------:|---------|
| 1 | Hardcoded Secrets | PASS | No secrets in production code |
| 2 | .env in .gitignore | PASS | Tracked files contain only public/mock values |
| 3 | XSS vectors | PASS | 0 risky HTML injection patterns in production code |
| 4 | SQL Injection | PASS | TypeORM parameterized queries; no raw user-input interpolation |
| 5 | JWT Configuration | PASS | 7d expiry, env-var secret, ignoreExpiration=false |
| 6 | CORS Configuration | PASS | Explicit allowlist + Vercel preview pattern regex |
| 7 | Password Hashing | PASS | bcrypt with 12 salt rounds |
| 8 | Rate Limiting | PASS | Global 60 req/min + auth 3-5 req/min throttle |
| 9 | Helmet / CSP | PASS | CSP + standard headers; crossOriginEmbedderPolicy:false for PWA |
| 10 | Exception Filter | PASS | Stack traces server-side only; sanitized response bodies |
| 11 | Scheduler Auth | PASS | timingSafeEqual for constant-time secret comparison |
| 12 | Public Endpoints | PASS | @Public() routes scoped to auth + public transit data |
| 13 | TypeORM synchronize | PASS | Dual-condition guard (non-prod AND DB_SYNCHRONIZE=true) |
| 14 | ValidationPipe | PASS | whitelist:true, forbidNonWhitelisted:true, transform:true |
| 15 | Swagger | PASS | API docs disabled in production (NODE_ENV check) |
| 16 | DevController | PASS | Excluded from production module + runtime assertNotProduction() |
| 17 | npm audit (Frontend) | WARN | 5 high -> 3 high, 3 moderate (2 non-breaking fixes applied) |
| 18 | npm audit (Backend) | WARN | 24 high -> 22 high, 9 moderate (2 non-breaking fixes applied) |
| 19 | SSL/TLS | INFO | rejectUnauthorized:false for Supabase pooler only (standard practice) |
| 20 | Proxy Trust | INFO | trust proxy not set; ThrottlerGuard uses CloudFront edge IP |

**Fixes applied: 2 | Advisories: 3**

---

## Fixes Applied

### Fix 1: undici 7.22.0 -> 7.24.1 (Frontend + Backend)

CVEs resolved: GHSA-f269-vfmq-vjvj (WebSocket parser overflow), GHSA-2mjp-6q6p-2qxm (HTTP smuggling), GHSA-vrm6-8vpv-qv8q (memory DoS), GHSA-4992-7rv2-5vpq (CRLF injection), GHSA-phc3-fgpg-7m6h (unbounded memory consumption)

Method: `npm audit fix` (non-breaking patch, both frontend and backend)

### Fix 2: flatted 3.3.3 -> 3.4.1 (Frontend + Backend)

CVE resolved: GHSA-25h7-pfq9-p65f (unbounded recursion DoS in parse() revive phase)

Method: `npm audit fix` (non-breaking patch, both frontend and backend)

---

## Remaining Advisories (Cannot fix without breaking changes)

### Advisory 1: multer (HIGH) — Backend

CVEs: GHSA-xf7r-hgr6-v32p, GHSA-v52c-386h-88mc, GHSA-5528-5vmv-3xc2

Affected: `@nestjs/platform-express@10.3.0` transitively depends on multer

Issues: DoS via incomplete multipart upload cleanup, resource exhaustion, uncontrolled recursion

Fix path: `@nestjs/platform-express@11.1.16` — requires NestJS v10 -> v11 major upgrade

Impact: This project has **0 file upload endpoints** (no @UploadedFile decorators found). The DoS vector requires specially crafted multipart requests. No multipart endpoints means practical risk is low.

Action: Track for next NestJS major version upgrade cycle.

### Advisory 2: serialize-javascript (HIGH) — Frontend build tooling

Affected: `workbox-build` -> `@rollup/plugin-terser` -> `serialize-javascript`

Issue: Code serialization during build step only (not a runtime dependency)

Fix path: Requires `vite@8.0.0` — Vite v5 -> v8 major upgrade

Impact: Build-time only. Zero runtime exposure in deployed app.

Action: Track for next Vite major version upgrade cycle.

### Advisory 3: esbuild <=0.24.2 (MODERATE) — Frontend dev server

Affected: `vite@5.x` -> `esbuild`

Issue: Dev server CORS bypass (any website can read dev server responses)

Fix path: Requires Vite v8

Impact: Development environment only. No production deployment exposure.

Action: Track with Advisory 2 — resolved when Vite v8 upgrade happens.

---

## Detailed Findings

### 1. Hardcoded Secrets

No secrets found in production code.

- `TEMPLATE_IDS` in `solapi.service.ts` contains Solapi template IDs (KA01TP*). These are public identifiers (like template names), not authentication secrets. API key/secret are correctly loaded from ConfigService.
- VAPID public key in `frontend/.env.production` is intentionally public by VAPID protocol design.
- `.env.production` (committed to git): public VAPID key + CloudFront URL only.
- `.env.test` (committed to git): mock/test values only.
- Test files contain strings like 'my-scheduler-secret', 'test-api-key' — test fixtures, not real secrets.

### 2. .gitignore Review

Root gitignore: covers `.env`, `.env.local`, `.env.*.local`.
Frontend gitignore: does not exclude `.env.production` or `.env.test` — both intentionally committed with only public/mock values.

Advisory: If a developer adds real secrets to `.env.production` in the future, they would be committed to git. The current file contents are safe.

### 3. XSS Review

- innerHTML, eval, insertAdjacentHTML: 0 occurrences in production React components
- User inputs handled via controlled React components (JSX auto-escaping)
- No raw DOM manipulation in production code

### 4. SQL Injection Review

- All database operations use TypeORM entity repository pattern or QueryBuilder
- QueryBuilder `.where()` calls use named parameter binding (`:param` syntax), never string interpolation
- Raw `queryRunner.query()` calls exist only in `seeds/sample-data.seed.ts` and all use positional `$1`, `$2` parameters
- No user-controlled values interpolated into SQL strings anywhere

### 5. CORS Configuration

Configured in `backend/src/main.ts` with explicit allowlist:
- localhost:5173-5178 (local dev)
- `https://frontend-xi-two-52.vercel.app` (production)
- `https://alert-commute-test.vercel.app` (test site)
- Regex for Vercel previews: locked to `frontend-xi-two-52` project slug only
- null origin (server-to-server) allowed
- Unrecognized origins: logged as warn and rejected

### 6. Helmet / CSP

Configured in `backend/src/main.ts`:
- `defaultSrc`: self
- `styleSrc`: self + unsafe-inline (required for Tailwind CSS)
- `scriptSrc`: self only
- `imgSrc`: self + data: + https:
- `crossOriginEmbedderPolicy`: false (PWA service worker compatibility)

### 7. JWT

- `JWT_SECRET` loaded from env via ConfigService; startup throws if not set
- `ignoreExpiration: false` — tokens expire correctly
- `expiresIn: 7d` — reasonable for this non-financial application
- Token extracted from Authorization Bearer header only
- Google OAuth callback uses URL fragment (`#`) to avoid server log/referrer exposure
- Hash cleared from browser history via `window.history.replaceState` after token extraction

### 8. Rate Limiting

Global ThrottlerGuard registered via APP_GUARD:
- Default: 60 requests / 60 seconds (all endpoints)
- POST /auth/register: 3 / 60s
- POST /auth/login: 5 / 60s (brute-force protection)
- Congestion data endpoint: 1 / 300s
- Insights endpoint: 1 / 300s

Minor hardening gap: App runs behind CloudFront. Without `trust proxy` set on the Express instance, ThrottlerGuard identifies clients by CloudFront's edge IP rather than `X-Forwarded-For`. This means rate limit buckets are shared across all users behind the same CloudFront PoP. Low severity for this use case but worth noting.

### 9. Password Hashing

bcrypt with 12 salt rounds (above the recommended minimum of 10). `bcrypt.compare()` used for verification (constant-time by implementation).

### 10. ValidationPipe

Global pipe applied in `bootstrap()`:
- `whitelist: true` — strips properties not declared in DTO
- `forbidNonWhitelisted: true` — rejects requests with undeclared properties (400)
- `transform: true` — automatic type coercion
- All request DTOs use class-validator decorators

### 11. Scheduler Endpoint Auth

`POST /scheduler/trigger`, `POST /scheduler/weekly-report`, `POST /scheduler/health` are `@Public()` (no JWT) but protected by:
- `x-scheduler-secret` header validation using `crypto.timingSafeEqual()` (timing-attack safe)
- Secret loaded from `ConfigService` (SCHEDULER_SECRET env var)
- Returns 401 if secret is missing or mismatched

### 12. Exception Filter

`AllExceptionsFilter` wraps all responses:
- 500+ errors: stack trace logged to CloudWatch only (not in response)
- Response body: `{ statusCode, message, path }` — no internal details leaked
- HTTP exceptions use developer-controlled messages

### 13. Token Storage Pattern

JWT stored in `localStorage` as `accessToken`. This is an intentional architectural decision (documented in project memory). Mitigating factors:
- No risky innerHTML usage in production code
- CSP `scriptSrc: self` blocks injected scripts
- HTTPS-only production environment (Vercel + CloudFront)

---

## npm audit Final State

| Package | Frontend | Backend |
|---------|----------|---------|
| undici | 7.24.1 (fixed) | 7.24.1 (fixed) |
| flatted | 3.4.1 (fixed) | 3.4.1 (fixed) |
| multer | n/a | HIGH (requires NestJS v11) |
| serialize-javascript | HIGH (requires Vite v8) | n/a |
| esbuild | MODERATE (dev-only) | n/a |

Frontend: 8 total -> 6 total (3 high, 3 moderate remaining — all build-tooling)
Backend: 39 total -> 37 total (22 high, 9 moderate remaining — all dev deps or multer)

All remaining high-severity items require semver-major dependency upgrades and have no direct runtime exposure in current usage patterns.
