# Q-4 Performance Optimization -- Implementation Notes

**Date**: 2026-02-18
**Implementer**: FE Developer Agent

---

## Summary

Implemented 8 performance optimizations targeting LCP, CLS, and INP improvements. All changes are CSS/HTML-only or minimal React changes. No new dependencies added. All 394 tests pass, TypeScript has 0 errors, build succeeds, and main bundle remains at 13.19KB gzip (under 15KB budget).

---

## Changes Made

### 1. font-display: swap (Task 4) -- ALREADY PRESENT

**Finding**: The Pretendard CDN CSS (`pretendardvariable.min.css`) already includes `font-display: swap` in its `@font-face` declaration. No change needed.

**File inspected**: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css`

### 2. fetchpriority="high" (Task 5)

**File**: `frontend/index.html`

Added `fetchpriority="high"` attribute to the main entry script tag. This tells the browser to prioritize downloading and parsing the main JS bundle, improving LCP.

```html
<script type="module" src="/src/main.tsx" fetchpriority="high"></script>
```

### 3. Font fallback metrics (Task 6)

**File**: `frontend/src/presentation/styles/base.css`

Added a `@font-face` declaration for `'Pretendard Fallback'` with metric overrides (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) that approximate Pretendard Variable metrics. This minimizes CLS during the font swap by making the system fallback font occupy roughly the same space as Pretendard.

Updated the `--font` CSS variable to include `'Pretendard Variable'` and `'Pretendard Fallback'` in the font stack:

```css
--font: 'Pretendard Variable', 'Pretendard', 'Pretendard Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Metric values used:
- `size-adjust: 100.1%`
- `ascent-override: 105%`
- `descent-override: 22%`
- `line-gap-override: 0%`

### 4. Skeleton CLS fix (Task 7)

**Files**:
- `frontend/src/presentation/App.tsx` -- Replaced inline `style={{}}` with CSS classes
- `frontend/src/presentation/styles/components.css` -- Added `.page-skeleton-title`, `.page-skeleton-hero`, `.page-skeleton-card` classes with explicit dimensions; added `min-height: 100vh` to `.page-skeleton`

Before (inline styles causing style recalculation):
```tsx
<div className="skeleton" style={{ width: '160px', height: '24px', marginBottom: '16px' }} />
```

After (CSS classes with stable dimensions):
```tsx
<div className="skeleton page-skeleton-title" />
```

### 5. content-visibility: auto (Task 8)

**File**: `frontend/src/presentation/styles/pages/home.css`

Added `content-visibility: auto` + `contain-intrinsic-size` to below-fold sections on the Home page:

- `.home-alert-section` -- `contain-intrinsic-size: auto 120px`
- `.home-stats` -- `contain-intrinsic-size: auto 160px`

These sections are typically below the viewport on initial load. `content-visibility: auto` lets the browser skip rendering off-screen content, improving INP and initial render time.

### 6. will-change hints (Task 9)

**Files**:
- `frontend/src/presentation/styles/pages/home.css` -- Added `will-change: transform` to `.bottom-nav`
- `frontend/src/presentation/styles/components.css` -- Added `will-change: transform` to `.toast-container`, `will-change: opacity` to `.modal-overlay`

These hints promote the elements to their own compositor layers, enabling GPU-accelerated animations.

### 7. CSS animation audit (Task 11)

**File**: `frontend/src/presentation/styles/components.css`

Fixed `@keyframes toastProgress` -- was animating `width` (triggers layout). Converted to `transform: scaleX()` (compositor-only):

Before:
```css
@keyframes toastProgress {
  from { width: 100%; }
  to { width: 0%; }
}
```

After:
```css
@keyframes toastProgress {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
```

Also added `transform-origin: left center` and `will-change: transform` to `.toast::after` to ensure the progress bar shrinks from the correct side.

**Other keyframe animations reviewed** (no changes needed -- already compositor-friendly):
- `badgePop` -- uses `transform: scale()` only
- `fadeInUp`, `fadeUp`, `fadeIn`, `fadeInRight` -- uses `transform` + `opacity` only
- `spin` -- uses `transform: rotate()` only
- `toastSlideIn`, `toastSlideUp` -- uses `transform` + `opacity` only
- `modalSlideIn`, `slideUp`, `modalIconPop` -- uses `transform` + `opacity` only
- `iconPulse`, `pulse`, `emptyBounce`, `shake` -- uses `transform` + `opacity` only

**Animations with non-compositor properties (left as-is)**:
- `pulse-soft` (box-shadow) -- used in commute tracking, not on critical path
- `pulse-glow` (box-shadow) -- used in commute tracking, not on critical path
- `shimmer`, `skeleton-shimmer` (background-position) -- background-position animations are lightweight and acceptable for skeleton loading states
- `blink` (opacity only) -- already compositor-friendly

### 8. React.memo audit (Task 10)

**Files**:
- `frontend/src/presentation/pages/home/AlertSection.tsx` -- Wrapped with `memo()`
- `frontend/src/presentation/pages/home/StreakBadge.tsx` -- Wrapped with `memo()`
- `frontend/src/presentation/pages/home/DeparturePrediction.tsx` -- Wrapped with `memo()`

These components are below-fold display components that receive stable props from the parent `HomePage`. Wrapping them with `React.memo` prevents unnecessary re-renders when sibling data changes (e.g., transit refresh timer ticking in `CommuteSection`).

Components **not** wrapped (intentional):
- `WeatherHeroSection` -- Uses `useState` internally, manages checklist interactions
- `CommuteSection` -- Has `useEffect` with timer, frequently changing transit data
- `StatsSection` -- Uses `useCollapsible` hook internally
- `WeeklyReportCard` -- Has expanding/collapsing state, receives changing `weekOffset`
- `HomePage` -- Top-level page component, should always re-render when data changes

---

## Quality Gates

| Gate | Status | Detail |
|------|--------|--------|
| Tests (394) | PASS | All 394 tests pass (30 test files) |
| TypeScript | PASS | 0 type errors |
| Build | PASS | Built in ~930ms |
| Main bundle | PASS | 13.19KB gzip (budget: 15KB) |
| ESLint | PASS | 0 errors |

---

## Files Modified

1. `frontend/index.html` -- fetchpriority="high"
2. `frontend/src/presentation/styles/base.css` -- Font fallback @font-face + updated --font variable
3. `frontend/src/presentation/styles/components.css` -- Skeleton classes, will-change hints, toastProgress animation fix
4. `frontend/src/presentation/styles/pages/home.css` -- content-visibility, will-change on bottom-nav
5. `frontend/src/presentation/App.tsx` -- PageLoader skeleton CSS classes (replaced inline styles)
6. `frontend/src/presentation/pages/home/AlertSection.tsx` -- React.memo
7. `frontend/src/presentation/pages/home/StreakBadge.tsx` -- React.memo
8. `frontend/src/presentation/pages/home/DeparturePrediction.tsx` -- React.memo

---

## Not Implemented (per instructions)

- **Lighthouse CI** -- PAT lacks workflow scope, cannot modify `.github/workflows/ci.yml`
- **Critical CSS extraction** -- Would require new Vite plugin dependency
- **CSS code-splitting** -- Would require build config changes, classified as "Could have"
- **New npm packages** -- None added per constraint
- **Backend changes** -- Out of scope per constraint
