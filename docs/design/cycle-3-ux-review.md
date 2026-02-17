# UX/UI Review: Cycle 3 - Code Structure & Auth Consistency

> Reviewer: PD Agent (Senior Product Designer)
> Date: 2026-02-17
> Scope: I-1 (HomePage Split), I-9 (AuthRequired), I-10 (PageHeader), I-12 (ARIA Tabs), I-4 (useAuth)
> Frameworks Applied: Nielsen's 10 Heuristics, Gestalt Principles, Fitts's Law, WCAG 2.1 AA

---

## 5-Second Test

### AuthRequired (non-login states)
- **First impression:** Centered empty state with icon, heading, description, and a prominent login button. Visually clean and focused.
- **Clarity:** Instantly communicates "you need to log in to use this feature."
- **CTA visibility:** The "로그인" button is the only interactive element -- unmistakable primary action.

### GuestLanding (homepage non-login)
- **First impression:** Marketing-style landing with brand bar, hero headline, and 3 feature cards. Feels like a product page, not an error state.
- **Clarity:** Immediately communicates "this is a commute assistant app."
- **CTA visibility:** Two CTAs ("시작하기" top-right, "무료로 시작하기" hero) provide clear entry points.

### PageHeader
- **First impression:** Clean, minimal header with title and optional action. Reads like standard page chrome.
- **Clarity:** Title is the dominant element. Sticky behavior prevents disorientation on scroll.

---

## What Works Well

### 1. AuthRequired: Strong empty state pattern
The AuthRequired component follows a well-established empty state pattern: **icon (visual anchor) -> heading (what happened) -> description (why / what to do) -> CTA (how to fix it)**. This is textbook visual hierarchy per Gestalt's **continuity** principle -- the eye flows naturally downward.

- The `aria-hidden="true"` on the icon is correct -- it's decorative, not informative
- The descriptions are page-specific ("알림을 설정하려면 먼저 로그인하세요"), which is better than a generic "로그인이 필요합니다" because it provides context about what the user gains by logging in (Nielsen H2: Match between system and real world)
- The `btn btn-primary` styling on the login link creates a large, prominent touch target (Fitts's Law)

### 2. AuthRequired vs GuestLanding: Clear differentiation
The spec correctly separates two distinct non-login experiences:
- **GuestLanding** = marketing landing page (first-time visitors, brand awareness, feature showcase)
- **AuthRequired** = simple auth gate (returning users who need to log in for a specific feature)

This is the right design decision. A marketing landing on every page would feel heavy and repetitive. A simple auth gate on the homepage would feel cold and unwelcoming. The two components serve fundamentally different user needs.

### 3. PageHeader: Consistency and simplicity
The `PageHeader` component enforces visual consistency across 4+ pages:
- Same `h1` styling (1.5rem, weight 700, `var(--ink)`)
- Same padding rhythm (20px top, 16px bottom)
- Same sticky behavior pattern
- Same flex layout with optional action slot

This eliminates the previous 3 different class names that had near-identical CSS. Per Nielsen H4 (Consistency and standards), users now see the same header pattern everywhere, which reduces cognitive load.

### 4. HomePage split: Clean orchestrator pattern
The 89-line `HomePage.tsx` orchestrator is highly scannable. The render tree reads like a table of contents:
```
GuestLanding (if not logged in)
-> Skeleton loading
-> Error notice
-> Header (greeting + user name)
-> WeatherHeroSection
-> DeparturePrediction
-> RouteRecommendation
-> CommuteSection
-> AlertSection
-> StatsSection
```
Each section is a self-contained component with clear props. This makes the page structure immediately legible to both developers and design reviewers.

### 5. ARIA tab compliance
All three tab interfaces (DashboardTabs, SettingsPage, RouteListView) now follow the same ARIA pattern:
- `role="tablist"` on the container with descriptive `aria-label`
- `role="tab"` with `id`, `aria-selected`, and `aria-controls` on each tab button
- `role="tabpanel"` with `id` and `aria-labelledby` on content panels
- SVG icons marked with `aria-hidden="true"`

---

## Issues Found

| Priority | Heuristic/Principle | Location | Current | Proposed Fix | Rationale |
|:--------:|---------------------|----------|---------|-------------|-----------|
| **P2** | Gestalt: Similarity | NotificationHistoryPage non-login | Uses old `.settings-empty` pattern with different spacing (60px padding, 16px gap) | Migrate to `AuthRequired` component | Pattern drift: 4 pages use `AuthRequired` while 1 uses the old inline approach. The visual difference (60px vs 3rem=48px padding, 16px vs 0.5rem=8px gap) creates subtle inconsistency. Users navigating between non-login states will perceive different "weight" for the same type of message. |
| **P2** | CSS completeness | PageHeader action slot | `.page-header-action` class used in JSX but has no CSS definition | Add minimal CSS: `.page-header-action { display: flex; align-items: center; }` or remove the wrapper div | The `<div className="page-header-action">` wrapping the action slot has no corresponding CSS rule. Currently works because flex parent handles layout, but the orphan class could confuse future developers. Slight risk of layout drift if someone adds padding to action content. |
| **P2** | Nielsen H4: Consistency | AuthRequired icon sizing | Icons are 48x48 SVGs with `strokeWidth="1.5"` across all 4 usages | No change needed now, but consider extracting icon constants | Each page passes inline SVG as the `icon` prop, duplicating the same `width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"` attributes. If an icon size change is needed later, 4 files must be updated. Low risk now, but worth noting for design token work. |
| **P3** | WCAG 2.1 AA: Keyboard | SettingsPage + RouteListView tabs | Tab buttons are keyboard-focusable via default `<button>` behavior, but no arrow-key navigation between tabs | Add `tabIndex={activeTab === tabId ? 0 : -1}` and `onKeyDown` arrow-key handler | WAI-ARIA Authoring Practices recommend "roving tabindex" for tab widgets: only the active tab should be in the tab order, and Left/Right arrow keys should move between tabs. However, the existing DashboardTabs (gold standard) also lacks this, so this is a systemic gap, not a regression. Log for a future accessibility-focused cycle. |
| **P3** | Fitts's Law | AuthRequired CTA | "로그인" button uses `.btn .btn-primary` (padding 12px 24px) | Consider `.btn-lg` for the auth-gate CTA | On the AuthRequired screen, the login button is the ONLY interactive element on an otherwise empty page. A larger touch target (`.btn-lg`) would better match the importance of this action and reduce misclicks on mobile. However, current sizing is adequate (min touch target well above 44px). Enhancement, not a bug. |
| **P3** | Nielsen H6: Recognition | AuthRequired description text | Each page uses slightly different phrasing: "먼저 로그인하세요" pattern | No change -- current approach is correct | The page-specific descriptions ("알림을 설정하려면...", "출퇴근 경로를 저장하려면...") are intentionally varied to explain what the user gains. This is better than a generic message. Noting for documentation. |

---

## Per-Component Review

### 1. AuthRequired Component (I-9) -- HIGH PRIORITY review

**Severity: No P0/P1 issues. 2 P2, 1 P3.**

**Visual hierarchy assessment:**
```
[48px icon]           -- Visual anchor, muted color, aria-hidden
[h2: 1.25rem/600]    -- "로그인이 필요해요" -- what's happening
[p: secondary color]  -- Page-specific description -- why + what to do
[btn btn-primary]     -- "로그인" CTA -- how to fix
```

This follows the recommended empty-state pyramid: **visual -> heading -> explanation -> action**. The hierarchy is clear and well-spaced.

**Spacing analysis:**
- Container: `3rem` (48px) top/bottom padding, `1.5rem` (24px) horizontal
- Gap between elements: `0.5rem` (8px) via flex gap
- h2 margin-top: `0.5rem` (8px) additional
- p margin-bottom: `1rem` (16px) -- creates breathing room before CTA

The spacing creates a comfortable visual rhythm. The CTA has enough separation from the description text.

**Cross-page consistency:** All 4 pages (AlertSettings, RouteSetup, Settings, CommuteDashboard) render identical structures with only the `pageTitle`, `icon`, and `description` varying. This is exactly the right level of parameterization.

**Differentiation from GuestLanding:** Clear and appropriate.
| Aspect | AuthRequired | GuestLanding |
|--------|-------------|--------------|
| Purpose | Auth gate for specific feature | Marketing landing |
| Tone | Functional ("먼저 로그인하세요") | Promotional ("출퇴근을 책임지는 앱") |
| Content | Single icon + 2 lines + 1 CTA | Brand bar + hero + 3 feature cards + footer |
| Layout | Centered column, minimal | Full-page marketing layout |
| CTA | "로그인" (direct) | "무료로 시작하기" (inviting) |

This differentiation is well-designed. No confusion between the two.

---

### 2. PageHeader Component (I-10) -- MEDIUM PRIORITY review

**Severity: 1 P2 (missing `.page-header-action` CSS).**

**Component structure:**
```tsx
<header className="page-header page-header-sticky">
  <h1>{title}</h1>
  {action && <div className="page-header-action">{action}</div>}
</header>
```

**Sticky behavior assessment:**
- Default sticky (`sticky = true`) is correct for most pages -- keeps context visible during scroll
- `sticky={false}` for non-login states (AuthRequired) is correct -- short pages don't need sticky headers
- `sticky={false}` for NotificationHistoryPage non-login is correct
- `z-index: 10` is appropriate -- above content, below modals

**Pages using PageHeader:**

| Page | Title | Action | Sticky | Assessment |
|------|-------|--------|--------|------------|
| AlertSettingsPage (logged in) | "알림" | none | true (default) | Correct |
| SettingsPage (logged in) | "내 설정" | none | true (default) | Correct |
| RouteListView | "경로" | "+ 새 경로" button | true (default) | Correct |
| NotificationHistoryPage (logged in) | "알림 기록" | count badge | true (default) | Correct |
| NotificationHistoryPage (non-login) | "알림 기록" | none | false | Correct |
| AuthRequired (via composition) | varies | none | false | Correct |

**Action slot flexibility:** The `action?: ReactNode` prop is flexible enough for the current use cases:
- Button ("+ 새 경로" in RouteListView)
- Badge/count (NotificationHistoryPage)
- None (most pages)

This is good progressive disclosure -- the header adapts to page needs without prop explosion.

**Visual consistency:** All pages now use the same `1.5rem/700/var(--ink)` h1 style. The previous inconsistency (3 different class names, slightly different padding in SettingsPage) is resolved.

---

### 3. HomePage Split (I-1) -- MEDIUM PRIORITY review

**Severity: No issues.**

**Orchestrator readability:** The 89-line `HomePage.tsx` is a model orchestrator:
- Clear conditional rendering: `!isLoggedIn` -> GuestLanding, `isLoading` -> skeleton, default -> full page
- Each section is a single-purpose component
- Props are explicit -- no hidden dependencies
- Loading skeleton shows appropriate placeholder shapes (header + 2 cards)

**GuestLanding assessment:**
- Brand bar with "출퇴근 메이트" branding + "시작하기" CTA -- standard app landing pattern
- Hero section: headline ("출퇴근을 책임지는 앱"), subtitle, and prominent CTA
- Feature cards: 3-step explanation (경로 등록 -> 자동 알림 -> 기록 & 분석) follows the "1-2-3" onboarding pattern
- Footer: minimal, appropriate
- Skip link (`<a href="#main-content" className="skip-link">`) present for accessibility

**Sub-component review:**

| Component | Lines | Props | aria-label | Assessment |
|-----------|------:|-------|------------|------------|
| WeatherHeroSection | 65 | 5 props | "현재 날씨 {condition} {temp}도" | Excellent: descriptive, dynamic |
| DeparturePrediction | 24 | 1 prop | "추천 출발 시간" | Good: concise |
| RouteRecommendation | 29 | 2 props | "경로 추천" | Good: dismiss button has `aria-label="추천 닫기"` |
| CommuteSection | 109 | 7 props | "오늘의 출퇴근" | Good: route type toggle has `role="group"` |
| AlertSection | 36 | 1 prop | "알림" | Good: both states (has alert / no alert) provide clear CTA |
| StatsSection | 75 | 4 props | "이번 주 통근" | Good: empty state has helpful message + link |

All sub-components properly use `<section>` with `aria-label`, which is excellent for screen reader navigation.

---

### 4. ARIA Accessibility (I-12) -- MEDIUM PRIORITY review

**Severity: 1 P3 (missing roving tabindex / arrow-key navigation).**

**SettingsPage tabs (4 tabs: profile, routes, alerts, app):**
- `role="tablist"` with `aria-label="설정 탭"` -- correct
- Each tab: `role="tab"`, `id="tab-{name}"`, `aria-selected`, `aria-controls="tabpanel-{name}"` -- correct
- Each panel: `role="tabpanel"`, `id="tabpanel-{name}"`, `aria-labelledby="tab-{name}"` -- correct
- Tab badge counts (routes count, active alerts count) provide useful at-a-glance info
- SVG icons in tabs have `aria-hidden="true"` -- correct

**RouteListView tabs (3 tabs: all, morning, evening):**
- `role="tablist"` with `aria-label="경로 필터"` -- correct
- Each tab: `role="tab"`, `id="tab-route-{name}"`, `aria-selected`, `aria-controls="tabpanel-route-list"` -- correct
- Shared panel: `role="tabpanel"`, `id="tabpanel-route-list"`, dynamic `aria-labelledby={`tab-route-${routeTab}`}` -- correct
- The shared panel pattern (all tabs point to one panel) is valid for filter-style tabs where the content area is the same list with different filters

**Comparison with DashboardTabs (gold standard):**
All three tab implementations now match the same ARIA attribute pattern. DashboardTabs places `role="tabpanel"` in child component files, while SettingsPage and RouteListView use inline wrapper divs. Both approaches are valid -- the critical `id`/`aria-controls`/`aria-labelledby` linkage is correct in all cases.

**Keyboard navigation gap (P3):**
None of the three tab components implement WAI-ARIA recommended keyboard patterns:
- Arrow keys to move between tabs
- Home/End to jump to first/last tab
- `tabIndex={0}` on active tab, `tabIndex={-1}` on inactive tabs

This is a systemic gap across the entire app, not a regression from this cycle. It should be addressed in a dedicated accessibility cycle.

---

### 5. Cross-Component Consistency

**Spacing:**
- `.page` container: `24px 20px` padding with safe-area-inset -- consistent
- `.page-header`: `20px 0 16px` padding -- consistent across all 4+ pages
- `.auth-required`: `3rem 1.5rem` padding -- slightly tighter than `.settings-empty` (60px 20px) used in NotificationHistoryPage, but close enough

**Typography:**
- Page title (h1): `1.5rem / 700` -- unified via PageHeader
- Auth heading (h2): `1.25rem / 600` -- appropriate subordination to h1
- Body text: uses `var(--ink-secondary)` for descriptions -- consistent

**Colors:**
- Primary actions: `var(--gradient-primary)` on `.btn-primary` -- consistent
- Muted icons: `var(--ink-muted)` -- used in both AuthRequired icons and empty-state icons
- Background: `var(--bg)` for sticky headers -- matches page background on scroll

**Transitions between pages:**
- No jarring transitions detected. The `.page` class has a `pageEnter` animation (0.4s ease) that applies consistently to all pages
- AuthRequired wraps in `<main className="page">` so it gets the same entrance animation

**One inconsistency detected:** NotificationHistoryPage's non-login state uses `.settings-empty` (16px gap, 60px padding) while the other 4 non-login states use `.auth-required` (8px gap, 48px padding). The visual difference is subtle (12px padding difference, 8px gap difference) but perceptible when rapidly switching between pages. This is the P2 issue noted above.

---

## Accessibility Assessment

### Passed
- [x] All decorative icons have `aria-hidden="true"`
- [x] All interactive elements use semantic HTML (`<button>`, `<a>`, `<Link>`)
- [x] Tab interfaces have complete ARIA linkage (id, aria-controls, aria-labelledby)
- [x] Skip links present on both HomePage and GuestLanding
- [x] Error notices use `role="alert"` with `aria-live`
- [x] Loading states use `role="status"` with `aria-live="polite"`
- [x] Button checklist items use `aria-pressed` for toggle state (WeatherHeroSection)
- [x] Route type toggle uses `role="group"` with `aria-label` (CommuteSection)
- [x] Form labels and icon buttons have appropriate `aria-label` attributes (SettingsPage)
- [x] The AuthRequired "로그인" CTA is a `<Link>` to `/login`, which is semantically correct (navigation, not action)

### Not Passed (P3, non-blocking)
- [ ] Tab components lack roving tabindex / arrow-key keyboard navigation (systemic gap, pre-existing)
- [ ] `<Link>` elements used as buttons should have `role="link"` (already correct by default via React Router)

### Notes
- The `.btn` base class has `12px 24px` padding, creating a minimum touch target of approximately 44x48px -- meets WCAG 2.5.5 (Target Size) minimum of 44x44px
- Color contrast was not visually tested in this review (would require browser rendering), but the CSS variables `var(--ink)` on `var(--bg)` and `var(--ink-secondary)` on `var(--bg)` are consistent with the existing design system which was previously verified

---

## Overall UX Verdict: PASS WITH NOTES

### Summary

This cycle is primarily a code-structure refactoring with minimal user-facing changes. The two visible changes -- AuthRequired component (I-9) and PageHeader unification (I-10) -- are well-designed improvements:

1. **AuthRequired** replaces 4 inconsistent non-login patterns with one unified component. It properly communicates the need to log in with clear visual hierarchy and an obvious CTA. The CommuteDashboardPage fix (adding a previously missing login CTA) is a genuine UX improvement.

2. **PageHeader** eliminates visual drift across page headers. Users now see a consistent header pattern everywhere.

3. **The HomePage split** is invisible to users but dramatically improves maintainability, which indirectly benefits UX through faster iteration cycles.

4. **ARIA improvements** bring SettingsPage and RouteListView tabs up to the same compliance level as DashboardTabs.

No P0 or P1 issues found. The P2 issues (NotificationHistoryPage pattern drift, missing `.page-header-action` CSS) are minor and do not block the cycle.

### P0 Count: 0
### P1 Count: 0
### P2 Count: 2
### P3 Count: 2

---

## Recommendations for Future Cycles

1. **Migrate NotificationHistoryPage to AuthRequired** (P2 backlog): The last remaining page using the old inline non-login pattern should adopt `AuthRequired` for full consistency.

2. **Add `.page-header-action` CSS rule** (P2 backlog): Even if the current layout works without it, define the class to prevent future confusion and ensure the action slot has proper alignment guarantees.

3. **Roving tabindex for all tab components** (P3 backlog): Implement WAI-ARIA recommended keyboard navigation (arrow keys, Home/End) across DashboardTabs, SettingsPage tabs, and RouteListView tabs in a dedicated accessibility cycle.

4. **Extract AuthRequired icons to constants** (P3 backlog): The 4 inline SVG icon definitions could be centralized (e.g., in a shared icons file or as constants) to reduce duplication and make icon-size changes trivial.

5. **Consider `.btn-lg` for AuthRequired CTA** (P3 backlog): The login button on an otherwise empty page could benefit from a larger touch target, though current sizing is adequate.

---

*Review conducted by PD Agent. No blocking issues for cycle completion.*
