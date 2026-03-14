# Build Check Report

Generated: 2026-03-14
Branch: `feature/e2e-auto-review-20260314`

---

## Summary

| Check | Result | Duration | Notes |
|-------|:------:|----------|-------|
| Frontend `tsc --noEmit` | ✅ PASS | ~3s | No type errors |
| Frontend `npm run build` | ✅ PASS | ~9.65s (vite) | 260 modules, 43 precache entries |
| Backend `tsc --noEmit` | ✅ PASS | ~3s | No type errors |
| Backend `npm run build` | ✅ PASS | ~3s | `nest build` clean |

**Overall: ✅ PASS (4/4)**

---

## Frontend Type Check (`tsc --noEmit`)

- **Result**: PASS
- **Errors**: 0
- **Warnings**: 0

## Frontend Build (`npm run build`)

- **Result**: PASS
- **Bundler**: Vite 5.4.21
- **Modules transformed**: 260
- **PWA**: v0.17.5, injectManifest mode, 43 precache entries (933.83 KiB)

### Bundle Size Summary

| Asset | Size | Gzip |
|-------|------|------|
| `vendor-react` | 142.21 kB | 45.56 kB |
| `index.css` | 305.92 kB | 49.13 kB |
| `RouteSetupPage` | 84.60 kB | 26.09 kB |
| `HomePage` | 60.10 kB | 17.72 kB |
| `AlertSettingsPage` | 46.43 kB | 12.40 kB |
| `CommuteDashboardPage` | 42.05 kB | 9.30 kB |
| `index (app)` | 42.04 kB | 13.75 kB |
| `vendor-query` | 38.99 kB | 11.64 kB |
| `SettingsPage` | 29.57 kB | 7.62 kB |
| `vendor-router` | 21.12 kB | 7.91 kB |
| `sw.js` | 67.35 kB | 18.12 kB |

### Warnings (non-blocking)

1. **CJS deprecation**: Vite's CJS Node API is deprecated (cosmetic, no impact)
2. **MODULE_TYPELESS_PACKAGE_JSON**: `postcss.config.js` not typed as ESM (cosmetic, add `"type": "module"` to package.json to suppress)

## Backend Type Check (`tsc --noEmit`)

- **Result**: PASS
- **Errors**: 0
- **Warnings**: 0

## Backend Build (`npm run build`)

- **Result**: PASS
- **Builder**: `nest build`
- **Output**: Clean, no warnings

---

## Fixes Applied

None required. All checks passed on first run.

---

## Verdict

**✅ PASS** -- Both frontend and backend type-check and build cleanly with zero errors.
