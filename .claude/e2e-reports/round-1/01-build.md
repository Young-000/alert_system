# Build Check Report

Generated: 2026-02-28
Branch: `main`

---

## Summary

| Check | Result | Duration | Notes |
|-------|:------:|----------|-------|
| Frontend `tsc --noEmit` | PASS | ~3s | No type errors |
| Frontend `npm run build` | PASS | ~1.3s (vite) | 245 modules, 41 precache entries |
| Backend `tsc --noEmit` | PASS | ~3s | No type errors |
| Backend `npm run build` | PASS | ~3s | `nest build` clean |

**Overall: PASS (4/4)**

---

## Frontend Type Check (`tsc --noEmit`)

- **Result**: PASS
- **Errors**: 0
- **Warnings**: 0

## Frontend Build (`npm run build`)

- **Result**: PASS
- **Bundler**: Vite 5.4.21
- **Modules transformed**: 245
- **PWA**: v0.17.5, injectManifest mode, 41 precache entries (882.59 KiB)

### Bundle Size Summary

| Asset | Size | Gzip |
|-------|------|------|
| `vendor-react` | 142.21 kB | 45.56 kB |
| `index.css` | 283.33 kB | 45.88 kB |
| `RouteSetupPage` | 84.26 kB | 25.97 kB |
| `HomePage` | 48.15 kB | 14.94 kB |
| `AlertSettingsPage` | 45.98 kB | 12.24 kB |
| `CommuteDashboardPage` | 41.48 kB | 9.16 kB |
| `index (app)` | 40.81 kB | 13.54 kB |
| `vendor-query` | 38.99 kB | 11.64 kB |
| `SettingsPage` | 28.68 kB | 7.40 kB |
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

**PASS** -- Both frontend and backend type-check and build cleanly with zero errors.
