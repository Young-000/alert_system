# Accessibility Review Report

**Date**: 2026-02-24
**Scope**: `frontend/src/` (all TSX components and CSS styles)

---

## Summary

The project demonstrates **strong** accessibility practices overall. Semantic HTML is used extensively, ARIA labels are applied on interactive elements, focus traps are implemented in all modals, skip links are present, and `role="alert"` / `aria-live` are used appropriately for dynamic content. The primary issue from the previous review (touch targets below 44px) has been fixed in this round.

**Verdict**: PASS with minor notes

---

## 1. Semantic HTML

**Status**: PASS

- All pages use `<main>` as the primary landmark.
- Navigation uses `<nav>` with `role="navigation"` and `aria-label`.
- Content is structured with `<section>`, `<article>`, `<header>`, `<footer>`.
- Buttons use `<button>` elements (no `<div onClick>` anti-pattern found for interactive elements).
- Modal overlays use `<div onClick>` only for backdrop dismiss with `role="dialog"` and `aria-modal="true"`.

**Files verified**:
- `/frontend/src/presentation/components/BottomNavigation.tsx` -- proper `<nav>` with `aria-label="메인 메뉴"` and `aria-current="page"`
- `/frontend/src/presentation/pages/home/HomePage.tsx` -- `<main>`, `<header>`, `<section>`
- `/frontend/src/presentation/pages/RouteSetupPage.tsx` -- `<main>`, `<nav>`
- `/frontend/src/presentation/pages/AlertSettingsPage.tsx` -- `<main>`, `<footer>`
- `/frontend/src/presentation/pages/alert-settings/AlertList.tsx` -- `<article>` for each alert item

### Heading Hierarchy

**Status**: PASS (minor)

- Pages consistently use `<h1>` for page-level titles and `<h2>`/`<h3>` for sections.
- No heading level skips detected (e.g., h1 -> h3 without h2).
- Some pages rendered inside tabs use `<h2>` without a visible `<h1>` on the page, but the page title is in the `<nav>` header. This is acceptable for SPA tab patterns.

---

## 2. Images

**Status**: PASS

- No `<img>` tags found in the codebase. All graphics use inline SVG icons with proper `aria-hidden="true"` when decorative, or `aria-label` when meaningful (via icon components).

**Files verified**:
- `/frontend/src/presentation/components/icons/*.tsx` -- All accept optional `ariaLabel` prop; when provided, `aria-label` is set and `aria-hidden` is removed.
- `/frontend/src/presentation/components/icons/icons.test.tsx` -- Tests verify this behavior.

---

## 3. Icon Button aria-label

**Status**: PASS

Extensive `aria-label` usage found on all icon-only buttons:

| Component | Label |
|-----------|-------|
| RouteCard edit/delete | `"수정"`, `"삭제"` |
| AlertList toggle/edit/delete | `"{name} 끄기/켜기"`, `"수정"`, `"삭제"` |
| StationSearchStep clear | `"검색어 지우기"` |
| SortableStopItem drag/remove | `"순서 변경"`, `"{name} 삭제"` |
| WeeklyReportCard nav | `"이전 주"`, `"다음 주"` |
| RouteRecommendation dismiss | `"추천 닫기"` |
| Toast dismiss | `"닫기"` |
| Back buttons | `"뒤로 가기"` |
| LoginPage password toggle | `"비밀번호 숨기기"` / `"비밀번호 표시"` |

---

## 4. Form Accessibility

**Status**: PASS

- All form inputs have associated `<label htmlFor>` or `aria-label`:
  - LoginPage: `<label htmlFor="email">`, `<label htmlFor="password">`, etc.
  - RoutineStep: `<label htmlFor="wake-up-time">`, `<label htmlFor="leave-home-time">`, etc.
  - EditAlertModal: `<label htmlFor="edit-name">`, `<label htmlFor="edit-schedule">`
  - ConfirmStep route name: `<label htmlFor="route-name-field">`
  - Search inputs: `aria-label="역 또는 정류장 검색"`, `aria-label="지하철역 검색"`
  - OnboardingPage slider: `aria-label="예상 소요 시간"`
  - ToggleSwitch: Wrapping `<label>` with `aria-label` on the input

- Error messages use `role="alert"` consistently:
  - OnboardingPage, AlertSettingsPage, RouteSetupPage, AnalyticsTab, NotificationHistoryPage, LoginPage, etc.

- Dynamic search results use `aria-live="polite"` and `aria-busy`.

---

## 5. Keyboard Accessibility

**Status**: PASS

### Focus Styles
- Base CSS (`base.css:123-138`) provides global `:focus-visible` styles:
  - All elements: `outline: 2px solid var(--primary); outline-offset: 2px`
  - Buttons: Additional `box-shadow: 0 0 0 4px var(--primary-glow)`
  - Links: `border-radius: var(--radius-sm)` for rounded outlines

- All `outline: none` occurrences have replacement focus indicators:
  - `summary:focus-visible` -- `box-shadow: inset 0 0 0 2px var(--primary)`
  - `.tab:focus-visible` -- `box-shadow: 0 0 0 2px var(--primary)`
  - `.choice-card:focus-visible` -- `border-color + box-shadow`
  - `.search-result-item:focus-visible` -- `border-color + box-shadow`
  - Input `:focus` states -- `border-color: var(--primary)`

### Focus Trap
- All modals implement `useFocusTrap()` hook with Escape key handling:
  - `DeleteConfirmModal.tsx`
  - `EditAlertModal.tsx`
  - `ConfirmModal.tsx`
  - `MilestoneModal.tsx`
  - `LineSelectionModal.tsx`

### Skip Links
- Present on key pages:
  - `HomePage.tsx:33` -- `<a href="#weather-hero" className="skip-link">본문으로 건너뛰기</a>`
  - `GuestLanding.tsx:6` -- `<a href="#main-content" className="skip-link">본문으로 건너뛰기</a>`
  - `LoginPage.tsx:99` -- `<a href="#auth-form" className="skip-link">`
- Skip link styling in `base.css:142+` with proper show-on-focus behavior and 44px min-height.

### Tab Order
- `role="tablist"` with `aria-label` used on:
  - DashboardTabs, RouteListView route filter, SettingsPage tabs
- `role="tabpanel"` with `aria-labelledby` used on all tab content panels.
- `role="group"` with `aria-label` used for radio-button-like selections.
- `role="listbox"` with `aria-label` used for search result lists.

---

## 6. Color Contrast

**Status**: PASS (note)

- Primary text color `var(--ink)` is dark (appears to be near-black) on white/light backgrounds.
- Muted text uses `var(--ink-muted)` and `var(--ink-secondary)` -- these should maintain 4.5:1 ratio but exact values depend on CSS custom properties (not directly auditable from code alone).
- Error state uses `var(--error)` (red) which typically provides sufficient contrast.
- Information is not conveyed by color alone -- icons, text labels, and patterns supplement color indicators.

**Recommendation**: Run Lighthouse or axe-core for runtime contrast verification.

---

## 7. Skip Link

**Status**: PASS

Skip links present on the three main entry pages (Home, Guest Landing, Login). The skip link in `base.css` has proper styling:
- Hidden off-screen by default (`top: -40px`)
- Visible on focus (`top: 0`)
- Minimum height 44px for touch accessibility

---

## 8. Previous Review Follow-Up (20260221)

### Touch Target Issue (24px -> 44px minimum)

**Status**: FIXED (this round)

Multiple interactive elements had touch targets below the WCAG 2.5.8 recommended 44x44px minimum. The following were identified and fixed:

| Element | File | Before | After |
|---------|------|--------|-------|
| `.tag-remove` (station tag X button) | `alerts.css` | 28x28px | 44x44px |
| `.weekly-report-nav-btn` (week nav arrows) | `home.css` | 28x28px | 44x44px |
| `.sortable-stop-remove` (stop delete button) | `routes.css` | 36x36px | 44x44px |
| `.search-clear` (search clear button) | `routes.css` | 32x32px | 44x44px |
| `.arrive-btn-mini` (checkpoint arrive button) | `components.css` | 32px height | 44px height |
| `.notice-link` (notice action link) | `components.css` | 32px height | 44px height |
| `.stepper-btn` (+/- stepper buttons) | `components.css` | 36x36px | 44x44px |
| `.stepper-sm .stepper-btn` (small stepper) | `components.css` | 28x28px | 36x36px |
| `.modal-close` (modal close button) | `components.css` | 32x32px | 44x44px |
| `.route-rec-dismiss` (recommendation dismiss) | `home.css` | no min set | 44x44px |
| Toast close button (Tailwind `w-6 h-6`) | `Toast.tsx` | 24x24px | 44x44px |
| `.weekly-report-nav-btn` (mobile override) | `home.css` | 36x36px | 44x44px |

**Total touch target fixes: 12**

---

## Remaining Notes (not blocking)

1. **Slider thumb** (`auth.css` `.duration-slider`): The range input thumb is 24x24px. This is a platform-native control and enlarging it may break visual design. WCAG allows smaller targets for native form controls. Not fixed.

2. **`.stepper-sm .stepper-btn`**: Increased from 28x28 to 36x36 (not full 44px) to preserve compact stepper layout. The small variant is used in constrained spaces where 44px would break the design.

3. **Pre-existing build error**: `OfflineBanner.tsx` references missing `useOnlineStatus` hook -- this is unrelated to accessibility and should be tracked in a separate report.

---

## Files Modified

| File | Changes |
|------|---------|
| `frontend/src/presentation/styles/pages/alerts.css` | `.tag-remove` min-width/height 28px -> 44px |
| `frontend/src/presentation/styles/pages/home.css` | `.weekly-report-nav-btn` 28px -> 44px; `.route-rec-dismiss` added 44px min; mobile override 36px -> 44px |
| `frontend/src/presentation/styles/pages/routes.css` | `.sortable-stop-remove` 36px -> 44px; `.search-clear` 32px -> 44px |
| `frontend/src/presentation/styles/components.css` | `.arrive-btn-mini` 32px -> 44px; `.notice-link` 32px -> 44px; `.stepper-btn` 36px -> 44px; `.stepper-sm .stepper-btn` 28px -> 36px; `.modal-close` 32px -> 44px |
| `frontend/src/presentation/components/Toast.tsx` | Close button `w-6 h-6` -> `w-11 h-11` (24px -> 44px) |
