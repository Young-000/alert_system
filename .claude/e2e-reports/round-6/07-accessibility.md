# Accessibility Review — Round 6

**Date**: 2026-03-04
**Scope**: `frontend/src/**/*.tsx` (non-test), CSS files
**Reviewer**: Accessibility checker agent

---

## Summary

| Category | Status | Details |
|----------|:------:|---------|
| img alt attributes | PASS | No `<img>` tags in codebase; icons use inline SVGs |
| Icon buttons aria-label | PASS | All icon-only buttons have `aria-label` |
| Form input labels | PASS | All inputs have associated `<label>` or `aria-label` |
| Semantic HTML | PASS | Proper `<main>`, `<nav>`, `<section>`, `<article>`, `<header>`, `<footer>` |
| Skip link | PASS | Present on HomePage, GuestLanding, LoginPage |
| Keyboard focus styles | PASS | Global `:focus-visible` styles + per-component focus styles |
| Color contrast (WCAG AA) | **FIXED** | 4 CSS variables below 4.5:1 ratio; 1 inline banner gradient |
| ARIA roles & properties | PASS | Comprehensive `role`, `aria-*` usage throughout |

**Result**: PASS (after 5 fixes)

---

## 1. Image Alt Attributes

**Status**: PASS

No `<img>` tags found in the codebase. All graphical elements use inline `<svg>` icons which are correctly marked with either:
- `aria-hidden="true"` when decorative (inside buttons with text labels)
- `aria-label` when they carry meaning

The icon components (`CheckIcon`, `ChevronIcon`, `CloseIcon`, etc.) implement a smart pattern:
```tsx
aria-hidden={ariaLabel ? undefined : true}
aria-label={ariaLabel}
role={ariaLabel ? 'img' : undefined}
```

---

## 2. Icon Buttons with aria-label

**Status**: PASS

All icon-only buttons have appropriate `aria-label` attributes:

| Component | Button | aria-label |
|-----------|--------|------------|
| `AlertList.tsx` | Edit button | `"수정"` |
| `AlertList.tsx` | Delete button | `"삭제"` |
| `RouteCard.tsx` | Card button | `"${route.name} 수정하기"` |
| `RouteCard.tsx` | Edit/Delete | `"수정"` / `"삭제"` |
| `SortableStopItem.tsx` | Drag handle | `"순서 변경"` |
| `SortableStopItem.tsx` | Remove | `"${stop.name} 삭제"` |
| `RouteRecommendation.tsx` | Dismiss | `"추천 닫기"` |
| `NotificationHistoryPage.tsx` | Error dismiss | `"오류 닫기"` |
| `CommuteTrackingPage.tsx` | Back | `"세션 취소"` |
| `CommuteDashboardPage.tsx` | Back | `"뒤로 가기"` |
| `ModeBadge.tsx` | Toggle | `"${label} - 탭하여 모드 전환"` |
| `WeatherHeroSection.tsx` | Location badge | `"위치 권한이 없어 서울 기준 날씨를 표시합니다"` |

---

## 3. Form Inputs with Labels

**Status**: PASS

All form inputs have proper label associations:

| Page | Input | Label Method |
|------|-------|-------------|
| `LoginPage.tsx` | email, name, phoneNumber, password | `<label htmlFor="...">` |
| `RoutineStep.tsx` | wake-up-time, leave-home-time, leave-work-time | `<label htmlFor="...">` |
| `EditAlertModal.tsx` | edit-name, edit-schedule | `<label htmlFor="...">` |
| `MissionAddModal.tsx` | mission-title | `<label htmlFor="...">` |
| `PlacesTab.tsx` | place-type, place-label, place-address | `<label htmlFor="...">` |
| `SmartDepartureTab.tsx` | dep-type, dep-route, dep-target, dep-prep | `<label htmlFor="...">` |
| `InsightsPage.tsx` | insights-sort-select | `<label htmlFor="...">` + sr-only text |
| `StationSearchStep.tsx` (route-setup) | search input | `aria-label="지하철역 검색"` / `"버스 정류장 검색"` |
| `StationSearchStep.tsx` (alerts) | station-search | `aria-label="역 또는 정류장 검색"` |
| `OnboardingPage.tsx` | duration-slider | `aria-label="예상 소요 시간"` |
| `TipForm.tsx` | textarea | `aria-label="팁 작성"` |
| `ToggleSwitch.tsx` | checkbox | `aria-label={ariaLabel}` (prop) |
| `AlertList.tsx` | toggle checkbox | `aria-label="${alert.name} 끄기/켜기"` |
| `AppTab.tsx` | push toggle | `aria-label="푸시 알림 켜기/끄기"` |
| `ConfirmStep.tsx` (route) | route-name-field | `<label htmlFor="...">` |

---

## 4. Semantic HTML Usage

**Status**: PASS

### Proper element usage:
- **`<main>`**: Present on all page-level components (HomePage, LoginPage, RouteSetupPage, AlertSettingsPage, CommuteDashboardPage, CommuteTrackingPage, MissionsPage, SettingsPage, InsightsPage, PatternAnalysisPage, ReportPage, NotFoundPage, AuthCallbackPage, NotificationHistoryPage, OnboardingPage, GuestLanding)
- **`<nav>`**: Used for BottomNavigation (`role="navigation" aria-label="메인 메뉴"`), page navs, PatternAnalysisPage tabs
- **`<section>`**: Used for content sections with `aria-label` throughout
- **`<article>`**: Used for AlertList items, RegionCard
- **`<header>`**: Used for page headers, CommuteDashboardPage, MissionsPage, InsightsPage, PatternAnalysisPage
- **`<footer>`**: Used in CommuteDashboardPage, LoginPage, OnboardingPage, GuestLanding, AlertSettingsPage

### div onClick check:
Only 2 instances found, both in modal overlays (`EditAlertModal`, `DeleteConfirmModal`) with `onClick={(e) => e.stopPropagation()}` -- these are event propagation stoppers on inner modal `<div>`, not interactive elements. The outer overlays use proper `role="dialog"`.

- **No `<div onClick>` used as buttons** -- all interactive elements use `<button>` or `<Link>`.

---

## 5. Skip Link

**Status**: PASS

Skip links are present on the main entry pages:

| Page | Skip Link Target | Text |
|------|------------------|------|
| `HomePage.tsx` | `#weather-hero` | "본문으로 건너뛰기" |
| `GuestLanding.tsx` | `#main-content` | "본문으로 건너뛰기" |
| `LoginPage.tsx` | `#auth-form` | "본문으로 건너뛰기" |

Skip link CSS (`base.css:142-157`):
- Hidden by default (`top: -40px`)
- Visible on focus (`top: 8px`)
- Proper styling with min-height 44px touch target

---

## 6. Keyboard Focus Styles

**Status**: PASS

Global focus styles defined in `base.css:122-139`:
```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

button:focus-visible, .btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--primary-glow);
}
```

Additional component-specific focus styles found in:
- `components.css`: Buttons, inputs, modals, tabs, tooltips, toggles (30+ rules)
- `routes.css`: Search inputs, route cards (10+ rules)
- `alerts.css`: Choice cards, search box, tags, time inputs (10+ rules)
- `home.css`: Weather summary, stats row, streak badges
- `insights.css`: Region cards, sort select, retry button
- `settings.css`: Toggle, form inputs
- `mission-settings.css`: Input wraps

**`prefers-reduced-motion`** is respected (`base.css:160-168`):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.1ms !important;
  }
}
```

---

## 7. Color Contrast (WCAG AA)

**Status**: FIXED (5 files changed)

### Issues Found and Fixed

The `:root` CSS custom properties had colors that failed WCAG AA (4.5:1) when used as text on white/light backgrounds:

| Variable | Old Value | Ratio on White | New Value | New Ratio | Status |
|----------|-----------|:--------------:|-----------|:---------:|:------:|
| `--primary` | `#6366f1` | 4.47:1 | `#5b5ee0` | 5.09:1 | FIXED |
| `--success` | `#10b981` | 2.54:1 | `#047857` | 5.48:1 | FIXED |
| `--warning` | `#f59e0b` | 2.15:1 | `#b45309` | 5.02:1 | FIXED |
| `--error` | `#ef4444` | 3.76:1 | `#c81e1e` | 5.74:1 | FIXED |

### Additional Fixes

| File | Issue | Fix |
|------|-------|-----|
| `base.css` | `--primary`, `--success`, `--warning`, `--error` CSS variables | Updated to WCAG AA compliant values |
| `base.css` | `--gradient-primary` hardcoded `#6366f1` | Updated to `#5b5ee0` |
| `SummaryTab.tsx` | Grade color fallback values | Updated fallbacks to match new variables |
| `LoadMoreButton.tsx` | Inline style `#ef4444` fallback | Updated to `var(--error, #c81e1e)` |
| `commute.css` | Hardcoded `#f59e0b` text color | Changed to `var(--warning, #b45309)` |
| `OfflineBanner.tsx` | White text on `#f59e0b`->`#d97706` gradient (2.15:1-3.19:1 FAIL) | Changed to `#92400e`->`#78350f` gradient (7.09:1+ PASS) |

### Colors that PASS (no change needed)

| Variable | Value | Ratio on White |
|----------|-------|:--------------:|
| `--ink` | `#1e293b` | 13.98:1 |
| `--ink-secondary` | `#475569` | 7.24:1 |
| `--ink-muted` | `#64748b` | 4.76:1 |

---

## 8. ARIA Roles and Properties

**Status**: PASS

Comprehensive ARIA implementation found across the codebase:

### Dialogs/Modals
- `ConfirmModal`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- `EditAlertModal`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- `DeleteConfirmModal`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- `MilestoneModal`: `aria-labelledby`
- `MissionAddModal`: `aria-labelledby`
- `LineSelectionModal`: `role="dialog"`
- All modals use `useFocusTrap` hook with ESC key handler

### Tab patterns (tablist/tab/tabpanel)
- `DashboardTabs`: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- `SettingsPage`: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- `ReportPage`: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- `PatternAnalysisPage`: `role="tablist"`, `aria-label="패턴 분석 탭"`
- `RouteListView`: `role="tablist"`, `role="tab"`
- Tab panels: `role="tabpanel"`, `aria-labelledby`

### Live regions
- Loading states: `role="status"`, `aria-live="polite"`
- Error messages: `role="alert"` or `aria-live="assertive"`
- Transit arrivals: `aria-live="polite"`
- Search results: `aria-busy` on search containers
- OfflineBanner: `role="alert"`, `aria-live="assertive"`

### Radio groups
- `TransportStep`: `role="radiogroup"`, `role="radio"`, `aria-checked`

### Listboxes
- `StationSearchStep`: `role="listbox"`, `role="option"`, `tabIndex={0}`

### Progress bars
- `StreakBadge`: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`

### Toggle buttons
- Filter buttons: `aria-pressed` (CommutSection, NotificationHistoryPage)
- Accordion buttons: `aria-expanded`, `aria-controls`

### Navigation
- `BottomNavigation`: `role="navigation"`, `aria-label="메인 메뉴"`, `aria-current="page"`

### Screen reader utilities
- `PageLoader` (App.tsx): `role="status"`, `aria-live="polite"`, `<span className="sr-only">페이지 로딩 중...</span>`
- `InsightsPage` loading: `<span className="sr-only">인사이트 로딩 중...</span>`
- `.sr-only` / `.visually-hidden` CSS classes defined in `components.css`

---

## Files Modified

1. `/frontend/src/presentation/styles/base.css` -- Updated `--primary`, `--success`, `--warning`, `--error` CSS variables and `--gradient-primary` for WCAG AA compliance
2. `/frontend/src/presentation/pages/report/SummaryTab.tsx` -- Updated grade color fallback values
3. `/frontend/src/presentation/pages/commute-dashboard/LoadMoreButton.tsx` -- Fixed inline error color reference
4. `/frontend/src/presentation/styles/pages/commute.css` -- Changed hardcoded warning text color to CSS variable
5. `/frontend/src/presentation/components/OfflineBanner.tsx` -- Fixed white-on-amber gradient to white-on-dark-amber for WCAG AA

---

## Recommendations (non-blocking)

1. **Remaining hardcoded color fallbacks in CSS**: Many `var(--success, #10b981)` patterns in `home.css` still reference old fallback values. While these use the CSS variable (which is now correct), updating fallbacks to match would improve consistency. These are low priority since the variable value takes precedence.

2. **Skip links on other pages**: Consider adding skip links to AlertSettingsPage, SettingsPage, CommuteDashboardPage, and other main pages (currently only HomePage, GuestLanding, LoginPage have them).

3. **Focus management on route transitions**: When navigating between pages via React Router, focus is not explicitly managed. Consider adding focus to main content after navigation for screen reader users.
