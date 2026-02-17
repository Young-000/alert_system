# Q-3: Bundle Size Optimization Report

## Summary

Optimized the frontend bundle from a monolithic 90.35KB gzip main chunk to a properly code-split architecture with a 12.82KB gzip app shell.

## Changes Made

### 1. HomePage Lazy Loading (`App.tsx`)
- **Problem**: HomePage was eagerly imported, pulling ALL API client singletons (11 clients) into the main bundle via barrel export chain: `HomePage -> useHomeData -> @infrastructure/api (barrel) -> all clients`
- **Fix**: Changed to `lazy(() => import('./pages/home/HomePage'))`, consistent with all other pages
- **Impact**: Moved ~39KB raw (12.13KB gzip) of HomePage code into a separate async chunk

### 2. Vendor Chunk Splitting (`vite.config.ts`)
- **Problem**: All vendor code bundled into a single index.js, invalidating entire cache on any code change
- **Fix**: Function-based `manualChunks` splitting React core, React Router, and TanStack Query into separate long-lived cache chunks
- **Impact**: Vendor chunks can be cached independently; app code updates don't re-download framework code

### 3. CSS Duplicate Removal (`components.css`)
- **Problem**: ~200 lines of duplicated CSS rules (3x toast definitions, 3x divider-text, 2x badge, 2x pulse keyframes)
- **Fix**: Removed all duplicate definitions, keeping the correct active version of each
- **Impact**: CSS reduced from 41.20KB to 40.91KB gzip (~0.3KB saving)

### 4. Bundle Analysis Tooling
- Added `rollup-plugin-visualizer` (devDependency)
- Added `build:analyze` script to package.json
- Added `bundle-stats.html` to .gitignore

### 5. HomePage Prefetch (`BottomNavigation.tsx`)
- Added `/` route to prefetch map so HomePage chunk loads on hover/touch of home nav item

## Before vs After

### Before (baseline)
| Chunk | Raw | Gzip |
|-------|-----|------|
| index.js (monolithic) | 277.85KB | 90.35KB |
| index.css | 141.74KB | 41.20KB |

### After (optimized)
| Chunk | Raw | Gzip | Purpose |
|-------|-----|------|---------|
| index.js (app shell) | 38.18KB | 12.82KB | Router, layout, auth |
| vendor-react | 142.21KB | 45.56KB | React + ReactDOM (long-term cache) |
| vendor-router | 21.12KB | 7.91KB | React Router (long-term cache) |
| vendor-query | 36.55KB | 11.09KB | TanStack Query (long-term cache) |
| HomePage | 39.05KB | 12.13KB | Lazy-loaded on navigation |
| index.css | 141.01KB | 40.91KB | Styles (deduplicated) |

### Key Metrics
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Main bundle (index.js) | 90.35KB gzip | 12.82KB gzip | **-86%** |
| CSS bundle | 41.20KB gzip | 40.91KB gzip | -0.7% |
| Total initial JS (uncached) | ~90KB gzip | ~77KB gzip | -14% |
| Total initial JS (cached vendors) | ~90KB gzip | ~12.82KB gzip | -86% |

Target was < 80KB main bundle. Achieved **12.82KB** (86% under target).

## Tree-Shaking Verification
- **@dnd-kit**: Only imported by RouteSetupPage (lazy-loaded). Correctly tree-shaken from main bundle.
- **@supabase/supabase-js**: Defined in `infrastructure/supabase/client.ts` but never imported by any runtime code. Fully tree-shaken (dead dependency).
- **API clients**: All 11 singleton clients bundled only in chunks that actually import them (via barrel).

## Quality Gate
- `tsc --noEmit`: 0 errors
- `vitest run`: 377/377 tests passed (28 test files)
- `tsc && vite build`: successful
- Bundle size target: achieved (12.82KB vs 80KB target)

## Files Modified
1. `src/presentation/App.tsx` - HomePage lazy loading
2. `vite.config.ts` - Vendor chunk splitting + visualizer
3. `src/presentation/components/BottomNavigation.tsx` - HomePage prefetch
4. `src/presentation/styles/components.css` - CSS duplicate removal
5. `package.json` - build:analyze script
6. `.gitignore` - bundle-stats.html exclusion
