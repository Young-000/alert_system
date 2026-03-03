# Round 3 - Build Check

**Date**: 2026-02-12
**Branch**: `fix/homepage-ux-feedback`

## Frontend Build

| Item | Result |
|------|--------|
| Command | `npm run build` (`tsc && vite build`) |
| TypeScript | PASS (0 errors) |
| Vite Build | PASS (777ms) |
| PWA (injectManifest) | PASS (22 entries, 646.51 KiB precache) |
| Output Modules | 121 modules transformed |
| Total Chunks | 17 files |
| Main Bundle | `index-CxQNtE8p.js` 230.36 KB (gzip: 77.29 KB) |
| CSS | `index-D5WGyVqa.css` 219.19 KB (gzip: 35.56 KB) |
| Service Worker | `sw.js` 60.77 KB (gzip: 16.69 KB) |

### Warnings (non-blocking)
- Vite CJS Node API deprecation warning (cosmetic, no impact)

## Backend Build

| Item | Result |
|------|--------|
| Command | `npm run build` (`nest build`) |
| NestJS Build | PASS (0 errors, 0 warnings) |

## Summary

| Area | Status | Errors | Fixes Applied |
|------|--------|--------|---------------|
| Frontend `tsc` | PASS | 0 | 0 |
| Frontend `vite build` | PASS | 0 | 0 |
| Frontend PWA | PASS | 0 | 0 |
| Backend `nest build` | PASS | 0 | 0 |
| **Total** | **PASS** | **0** | **0** |
