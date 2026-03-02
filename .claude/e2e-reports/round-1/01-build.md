# Build Check Report

Generated: 2026-03-03
Branch: `feature/e2e-auto-review-20260303`

---

## Summary

| Check | Result | Notes |
|-------|:------:|-------|
| Frontend `tsc` | PASS | No type errors |
| Frontend `vite build` | PASS | 263 modules, 46 precache entries (957.86 KiB) |
| Backend `nest build` | PASS | Clean, no errors |

**Overall: PASS (3/3)**

---

## Frontend Build (`npm run build`)

- **Result**: PASS
- **Bundler**: Vite 5.4.21
- **TypeScript**: tsc pass (0 errors)
- **Modules transformed**: 263 (up from 245 in Round 5)
- **PWA**: v0.17.5, injectManifest mode, 46 precache entries (957.86 KiB)
- **Total dist size**: 1.1 MB
- **JS chunks**: 33
- **CSS chunks**: 5

### Bundle Size Summary

| Asset | Size | Gzip |
|-------|------|------|
| `vendor-react` | 142.21 kB | 45.56 kB |
| `index.css` | 305.75 kB | 49.07 kB |
| `RouteSetupPage` | 84.28 kB | 25.99 kB |
| `HomePage` | 59.90 kB | 17.68 kB |
| `AlertSettingsPage` | 45.98 kB | 12.24 kB |
| `index (app)` | 42.18 kB | 13.81 kB |
| `CommuteDashboardPage` | 41.50 kB | 9.12 kB |
| `vendor-query` | 38.99 kB | 11.64 kB |
| `SettingsPage` | 28.68 kB | 7.40 kB |
| `vendor-router` | 21.12 kB | 7.91 kB |
| `sw.js` | 67.35 kB | 18.12 kB |

### Estimated Total Gzip

~168 kB (JS) + ~55 kB (CSS) = ~223 kB total gzip -- well within 500 KB target.

### Warnings (non-blocking)

1. **CJS deprecation**: Vite's CJS Node API is deprecated (cosmetic, no impact)
2. **MODULE_TYPELESS_PACKAGE_JSON**: `postcss.config.js` not typed as ESM (cosmetic, add `"type": "module"` to package.json to suppress)

---

## Backend Build (`npm run build`)

- **Result**: PASS
- **Builder**: `nest build`
- **Output**: Clean, no warnings or errors
- **Total dist size**: 5.0 MB
- **Structure**: Clean Architecture (application, domain, infrastructure, presentation)

---

## Comparison with Previous Round

| Metric | Round 5 (02-28) | Round 6 (03-03) | Delta |
|--------|-----------------|-----------------|-------|
| FE modules | 245 | 263 | +18 |
| FE precache entries | 41 | 46 | +5 |
| FE precache size | 882.59 KiB | 957.86 KiB | +75.27 KiB |
| FE index.css gzip | 45.88 kB | 49.07 kB | +3.19 kB |
| FE HomePage gzip | 14.94 kB | 17.68 kB | +2.74 kB |
| BE build | PASS | PASS | -- |

Growth is modest and consistent with new feature additions (community, insights, congestion).

---

## Fixes Applied

None required. All checks passed on first run.

---

## Verdict

**PASS** -- Both frontend and backend type-check and build cleanly with zero errors. No fixes needed.
