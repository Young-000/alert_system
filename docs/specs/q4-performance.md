# Q-4: Performance Profiling + Optimization

**Date**: 2026-02-18
**Version**: v1.0
**Author**: PM Agent

---

## JTBD

When I open the commute alert app on a slow mobile connection during my morning rush, I want the page to load and become interactive within 2 seconds, so I can check my alerts and departure info without frustration or delay.

## Problem

- **Who**: Daily commuters using the PWA on mobile (mid-range Android devices, 4G/LTE networks). This is the primary persona -- someone checking the app at 7 AM while walking to the station.
- **Pain**: High frequency (daily, often twice a day) x moderate severity. If the app feels sluggish, the user opens a native weather/transit app instead and the product loses its value proposition of "one integrated view."
- **Current workaround**: Users wait, or abandon and use separate apps for weather/transit/air quality.
- **Success metric**: Lighthouse Performance score 90+ on mobile simulation (Moto G Power, Slow 4G). Core Web Vitals all in "Good" range: LCP < 2.5s, CLS < 0.1, INP < 200ms.

## Current State (Baseline)

### What already works well
| Optimization | Status | Detail |
|---|---|---|
| Code splitting | Done (Q-3) | All pages lazy-loaded, main bundle 12.82KB gzip |
| Vendor chunk splitting | Done (Q-3) | React/Router/Query in separate long-lived cached chunks |
| Idle preload | Done | Key pages preloaded after 3s via `useIdlePreload` |
| SW font caching | Done | Pretendard font cached CacheFirst for 1 year |
| SW API caching | Done | Weather/air-quality/transit search uses StaleWhileRevalidate (5min TTL) |
| Non-blocking font load | Done | Font stylesheet uses `media="print" onload="this.media='all'"` pattern |
| DNS prefetch | Done | `preconnect` + `dns-prefetch` for cdn.jsdelivr.net |
| Skeleton loading | Done | PageLoader skeleton shown during lazy chunk load |
| SVG icon system | Done (Cycle 8) | Inline SVG components, no icon font overhead |
| Tailwind CSS | Done (Cycle 8) | Utility-first, purged in production |

### Known gaps (not yet addressed)
| Gap | Impact | Priority |
|---|---|---|
| No `font-display: swap` on web font | Invisible text during font load (FOIT), harms LCP | P0 |
| 17,742 lines of custom CSS loaded monolithically | Large initial CSS payload (~41KB gzip), much is page-specific | P1 |
| 118 `@keyframes`/`animation` declarations in CSS | Contributes to parser time; many are page-specific | P2 |
| 376 `transition`/`transform` rules in CSS | Heavy composite layer cost if not GPU-promoted | P2 |
| No `fetchpriority` or `loading="lazy"` on any asset | Browser cannot prioritize critical resources | P1 |
| No Lighthouse CI gate | No regression detection; scores unknown until manual check | P0 |
| No `will-change` or `content-visibility` hints | Browser cannot optimize off-screen content | P3 |

## Solution

### Overview

This spec focuses on **measurement-first optimization**. The first task is to establish a Lighthouse CI baseline and automated regression gate. Only after measuring do we apply targeted fixes, prioritized by impact on the three Core Web Vitals (LCP, CLS, INP). All changes are frontend-only and must not increase the current bundle size.

The approach follows the principle: "Don't optimize what you haven't measured." Every optimization in the task list is justified by a specific CWV bottleneck.

### Strategy by Core Web Vital

**LCP (Largest Contentful Paint) -- target < 2.5s**
- The LCP element on the home page is likely the Weather Hero section or the first visible card. The bottleneck is: (1) font FOIT blocking text paint, (2) large monolithic CSS blocking render, (3) no resource hints for above-the-fold content.
- Fixes: `font-display: swap`, critical CSS inlining, `fetchpriority="high"` on hero elements, preload critical font subset.

**CLS (Cumulative Layout Shift) -- target < 0.1**
- Potential shift sources: font swap causing text reflow, skeleton-to-content transitions, lazy-loaded page chunks, bottom navigation pushing content.
- Fixes: size-matched font fallback, explicit dimensions on skeleton placeholders, stable layout containers.

**INP (Interaction to Next Paint) -- target < 200ms**
- Heavy CSS parsing (17K+ lines) can delay style recalculation on interaction. Complex page components with many DOM nodes (RouteSetupPage, CommuteDashboardPage) may cause slow re-renders.
- Fixes: `content-visibility: auto` on off-screen sections, reduce CSS scope, audit React re-renders with Profiler and apply `React.memo` only where measured need exists.

### User Flow (Performance Journey)

```
1. User opens app URL
   -> DNS already resolved (preconnect)
   -> HTML served (CloudFront cache hit)
   -> Critical CSS parsed (inlined or first-paint CSS)
   -> Font loads with swap (text visible immediately in fallback)
   -> LCP fires (hero content painted with system font, then swapped)

2. User sees home page
   -> JS chunks load in parallel (vendor cached, app shell small)
   -> API data fetched (SW cache hit for repeat visits)
   -> Page becomes interactive (INP ready)

3. User navigates to /routes or /alerts
   -> Lazy chunk already preloaded (idle preload at 3s)
   -> Page-specific CSS only processed for that route
   -> Off-screen content deferred (content-visibility)
```

## Scope (MoSCoW)

### Must have
1. **Lighthouse CI in GitHub Actions** -- automated score tracking on every PR, with assertions for Performance >= 90, Accessibility >= 90, Best Practices >= 90
2. **Baseline measurement report** -- document current Lighthouse scores (mobile simulation) before any optimization
3. **`font-display: swap`** -- eliminate FOIT for Pretendard web font
4. **`fetchpriority="high"`** on the main entry script (`main.tsx`) in `index.html`
5. **`content-visibility: auto`** on below-fold page sections (sections not visible in initial viewport)
6. **Explicit dimensions on skeleton placeholders** -- prevent CLS from skeleton-to-content swap

### Should have
7. **Critical CSS extraction** -- inline above-the-fold CSS in `<head>` (or use Vite plugin) to unblock first paint
8. **Font fallback metrics matching** -- use `size-adjust`, `ascent-override`, `descent-override` on system font fallback to minimize CLS during font swap
9. **`will-change: transform`** on animated elements that currently trigger layout (bottom nav, toasts, modals)
10. **React Profiler audit** -- measure top 3 pages (Home, RouteSetup, AlertSettings) for unnecessary re-renders, apply `React.memo` only where profiler shows wasted renders > 5ms

### Could have
11. **CSS code-splitting per route** -- move page-specific CSS into component-level imports so only active page CSS is loaded (requires build config change)
12. **Preload critical font subset** -- preload only the woff2 for the weight used in hero text (e.g., Pretendard 600/700)
13. **`loading="lazy"` on PWA icons** in manifest-related images (minor, icons are small)
14. **`<link rel="modulepreload">` for vendor chunks** -- hint browser to preload React/Router chunks

### Won't have (this cycle)
- **Image optimization (WebP/AVIF conversion)** -- project has only 2 PWA icons (192px, 512px PNG). No user-facing images to optimize. Not worth the tooling investment.
- **Third-party script optimization** -- no third-party scripts loaded (no analytics, no ads). Nothing to defer/async.
- **Server-side rendering (SSR)** -- architectural change, out of scope for a performance polish cycle.
- **HTTP/2 Server Push** -- CloudFront configuration change, not frontend-only.
- **Backend API response optimization** -- spec constraint: frontend-only changes.
- **New dependencies** (e.g., `critters`, `critical`) -- prefer zero-dependency solutions unless absolutely necessary. If critical CSS extraction requires a Vite plugin, evaluate `vite-plugin-critical` but only if it has < 50KB install footprint and active maintenance.

## Acceptance Criteria

### Measurement & CI (Must)
- [ ] Given the CI pipeline, When a PR is opened, Then Lighthouse CI runs on the built frontend and reports scores as a PR comment or check annotation
- [ ] Given the Lighthouse CI config, When Performance score drops below 90 on mobile simulation, Then the CI check fails and blocks merge
- [ ] Given the Lighthouse CI config, When Accessibility score drops below 90, Then the CI check warns (non-blocking, for awareness)
- [ ] Given the project repository, When the spec implementation begins, Then a baseline report is committed to `docs/specs/q4-performance-baseline.md` with current LCP/CLS/INP/Performance scores

### Font Optimization (Must)
- [ ] Given a user loading the app on a slow connection, When the Pretendard font has not yet loaded, Then text is visible immediately using the system fallback font (no invisible text / FOIT)
- [ ] Given the font swap occurs, When the Pretendard font finishes loading, Then CLS caused by the font swap is < 0.05 (measured via Lighthouse or Web Vitals)

### Resource Hints (Must)
- [ ] Given the `index.html` file, When inspected, Then the main entry script has `fetchpriority="high"` and the font stylesheet link has a font-display directive applied

### Layout Stability (Must)
- [ ] Given the PageLoader skeleton, When it transitions to actual page content, Then the content occupies the same approximate space (no visible layout jump)
- [ ] Given any page load, When measured by Lighthouse, Then CLS is < 0.1

### Render Performance (Should)
- [ ] Given the home page with multiple collapsible sections, When below-fold sections are not in viewport, Then they use `content-visibility: auto` with explicit `contain-intrinsic-size`
- [ ] Given a React Profiler recording of the Home page, When the user is idle (no interaction), Then there are zero unnecessary re-renders (no wasted render cycles)

### Quality Gates (Must -- non-negotiable)
- [ ] Given the existing test suite (394 frontend tests), When `npm test` runs, Then all 394 tests pass with 0 failures
- [ ] Given the TypeScript codebase, When `tsc --noEmit` runs, Then there are 0 type errors
- [ ] Given the production build, When `vite build` runs, Then the main chunk (index.js) remains <= 15KB gzip (current: 12.82KB)
- [ ] Given the production build, When the total initial JS is measured, Then it does not exceed the current ~77KB gzip uncached baseline

### Final Score (Must)
- [ ] Given the deployed frontend on Vercel, When Lighthouse mobile simulation runs (Moto G Power, Slow 4G throttling), Then Performance score is >= 90

## Task Breakdown

### Phase 1: Measure (establish baseline)

| # | Task | Size | Deps | CWV Target |
|---|------|------|------|------------|
| 1 | Run Lighthouse CLI locally on current production build, document baseline scores (Performance, LCP, CLS, INP, TBT, FCP) in `docs/specs/q4-performance-baseline.md` | S | none | -- |
| 2 | Add Lighthouse CI to GitHub Actions (`ci.yml`): install `@lhci/cli`, run `lhci autorun` against Vite preview server, assert Performance >= 85 initially (raise to 90 after optimizations) | M | none | -- |
| 3 | Configure LHCI to output results as GitHub status check or upload to temporary public storage | S | 2 | -- |

### Phase 2: Quick wins (high impact, low effort)

| # | Task | Size | Deps | CWV Target |
|---|------|------|------|------------|
| 4 | Add `font-display: swap` to Pretendard font. Since the font is loaded via CDN stylesheet (not self-hosted `@font-face`), verify the CDN CSS already includes `font-display: swap`. If not, add a local `@font-face` override in `base.css` with `font-display: swap` for the Pretendard variable font | S | 1 | LCP |
| 5 | Add `fetchpriority="high"` to the `<script type="module" src="/src/main.tsx">` tag in `index.html` | S | none | LCP |
| 6 | Add font fallback with metric overrides: define `@font-face` for system font stack with `size-adjust`, `ascent-override`, `descent-override` matching Pretendard metrics to minimize CLS on font swap | M | 4 | CLS |
| 7 | Add explicit width/height or min-height to `PageLoader` skeleton components (replace inline `style={{}}` with CSS classes that match actual page content dimensions) | S | none | CLS |

### Phase 3: Render optimization

| # | Task | Size | Deps | CWV Target |
|---|------|------|------|------------|
| 8 | Add `content-visibility: auto` + `contain-intrinsic-size` to below-fold sections on Home page (AlertSection, CommuteSection, StatsSection when collapsed) | M | none | INP |
| 9 | Add `will-change: transform` to animated elements: bottom-nav, toast-container, modal-overlay. Remove after animation completes where applicable | S | none | INP |
| 10 | Run React Profiler on Home, RouteSetup, AlertSettings pages. Document findings. Apply `React.memo` only to components with measured wasted renders > 5ms | M | none | INP |
| 11 | Audit CSS animations: ensure all `@keyframes` use only `transform` and `opacity` (compositor-only properties). Fix any that trigger layout/paint | S | none | INP |

### Phase 4: Validation

| # | Task | Size | Deps | CWV Target |
|---|------|------|------|------------|
| 12 | Run full test suite (`npm test`, `tsc --noEmit`, `vite build`), verify all quality gates pass | S | 4-11 | -- |
| 13 | Run Lighthouse CI on optimized build. Compare scores against baseline. Document before/after in the baseline report | S | 12 | -- |
| 14 | Raise LHCI assertion threshold from 85 to 90 for Performance score | S | 13 | -- |
| 15 | Deploy to Vercel preview, run Lighthouse on deployed URL, confirm Performance >= 90 on mobile simulation | S | 14 | -- |

### Total effort estimate
- **Must-have tasks** (1-7, 12-15): ~8 tasks, mostly S/M = approx 1 dev cycle
- **Should-have tasks** (8-11): ~4 tasks, M = approx 0.5 dev cycle
- **Total**: 1-1.5 dev cycles

## Open Questions

1. **Pretendard CDN `font-display`**: Does the jsDelivr-hosted Pretendard CSS already include `font-display: swap`? If yes, task 4 is trivial (verify only). If no, we need a local `@font-face` override. Dev should check this first.
2. **LHCI storage**: For CI, should we use `lhci server` (self-hosted), `temporary-public-storage` (free LHCI server), or just inline assertions? Recommendation: start with `temporary-public-storage` (zero infrastructure) and inline assertions.
3. **CSS code-splitting feasibility**: Vite + PostCSS currently bundles all CSS into one file. Is it worth adding `vite-plugin-css-injected-by-js` to split CSS per lazy chunk? This is a "Could have" -- only pursue if Phase 2 + 3 don't reach the 90 target.

## Out of Scope

- **Image optimization**: Only 2 small PWA icons exist. No user-uploaded or content images. Cost of adding image pipeline (sharp, squoosh) is not justified.
- **Third-party scripts**: No analytics, ads, or third-party JS loaded. Nothing to optimize.
- **Backend changes**: API response times, caching headers, database queries are all out of scope per constraint.
- **SSR/SSG**: Architectural change requiring framework migration. Not appropriate for a polish cycle.
- **Custom domain / CDN config**: Infrastructure changes (Route 53, CloudFront cache policies) are not frontend changes.
- **CSS-in-JS migration**: Current CSS architecture (Tailwind + custom CSS files) is established. A styling paradigm shift is not a performance task.
- **New dependency additions**: No new runtime dependencies. `@lhci/cli` is a devDependency for CI only. If any optimization requires a new dependency, it must be justified against the "Could have" bar and approved.

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Lighthouse score varies between runs (flaky) | High | Use median of 3 runs in LHCI config. Set threshold at 85 initially, raise after stable. |
| `font-display: swap` causes noticeable FOUT (flash of unstyled text) | Medium | Use metric-matched fallback font (task 6) to minimize visual difference during swap. |
| `content-visibility: auto` causes scroll jank on some browsers | Low | Only apply to truly off-screen sections. Test on Chrome/Safari. Progressive enhancement -- remove if issues found. |
| CSS changes break existing visual tests or layouts | Medium | Run all 394 unit tests + visual spot-check on 3 key pages before merge. |
| LHCI in CI adds significant pipeline time | Medium | Run only on PR (not push to main). Use Vite preview (not full deploy). Target < 2 min added. |

---

*References: [web.dev/performance](https://web.dev/performance), [Lighthouse CI docs](https://github.com/GoogleChrome/lighthouse-ci), [Q-3 Bundle Optimization](./q3-bundle-optimization.md)*
