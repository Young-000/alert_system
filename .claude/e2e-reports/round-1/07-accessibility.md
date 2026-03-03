# 07. Accessibility (a11y) - Round 1

## Status: PASS

---

## Audit Scope

**Target**: `frontend/src/` (all TSX components)
**Standard**: WCAG 2.1 AA
**Checks**: 8 categories

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | img alt attributes | PASS | No `<img>` tags; all visuals are inline SVGs with aria-hidden or role="img" |
| 2 | Icon button aria-label | PASS | All icon-only buttons have aria-label |
| 3 | Form field label connections | PASS | All inputs connected via htmlFor/id or aria-label |
| 4 | Semantic HTML | PASS | Extensive use of main, nav, section, header, footer, article, button |
| 5 | Keyboard accessibility | PASS | tabIndex, onKeyDown, useCollapsible hook, skip links |
| 6 | aria-hidden usage | PASS | Decorative icons/emojis properly marked |
| 7 | role attribute usage | PASS | dialog, switch, alert, progressbar, navigation, tablist, etc. |
| 8 | Focus trap in modals | PASS | All modals use useFocusTrap hook with ESC handling |

---

## 1. img alt Attributes -- PASS

No `<img>` tags exist in the frontend. All visual elements use inline SVG:

- **Decorative SVGs**: Marked with `aria-hidden="true"` (navigation icons, emoji spans, check marks)
- **Meaningful SVGs**: Use `role="img"` with `aria-label` (chart bars in RouteComparisonChart)

---

## 2. Icon Button aria-label -- PASS

Every icon-only button has an appropriate `aria-label`:

| Component | Examples |
|-----------|---------|
| BottomNavigation | All 4 nav tabs with text labels + aria-hidden icons |
| AlertList | `aria-label="알림 삭제"`, `"알림 수정"` |
| MissionCard | `"${title} 수정"`, `"삭제"`, `"위로 이동"`, `"아래로 이동"` |
| PageHeader | `aria-label="뒤로 가기"` |
| CommuteTrackingPage | `aria-label="세션 취소"` |
| Toast | `aria-label="닫기"` |
| LoginPage | Password toggle with aria-label |
| CommuteDashboardPage | Nav back buttons with aria-label |
| Settings pages | All back buttons with aria-label |

---

## 3. Form Field Label Connections -- PASS

| Form | Pattern |
|------|---------|
| LoginPage | `<label htmlFor="email">` + `<input id="email">`, `aria-required`, `autoComplete` |
| EditAlertModal | `<label htmlFor="edit-name">` |
| RouteSetupPage | `htmlFor` + `id` on all inputs, `aria-label` on search |
| MissionAddModal | `<label htmlFor="mission-title">`, `<label htmlFor="mission-emoji">` |
| OnboardingPage | `htmlFor="custom-duration"` |
| AlertSettingsPage | `htmlFor="wake-up-time"`, `"leave-home-time"`, `"leave-work-time"` |

---

## 4. Semantic HTML -- PASS

| Element | Usage |
|---------|-------|
| `<main>` | Every page wraps content in `<main className="page">` |
| `<nav>` | BottomNavigation uses `<nav role="navigation">` |
| `<section>` | Route sections, mission type sections, settings sections |
| `<header>` | Page headers in tracking, settings, mission, dashboard pages |
| `<footer>` | Used in home, dashboard pages |
| `<article>` | Alert cards |
| `<button>` | All clickable elements use native `<button>` |
| `<form>` | LoginPage |

Only 2 `<div onClick>` found -- both are modal overlay backdrop clicks (acceptable pattern).

---

## 5. Keyboard Accessibility -- PASS

| Feature | Implementation |
|---------|---------------|
| useCollapsible hook | Provides `role="button"`, `tabIndex: 0`, `onKeyDown` (Enter/Space) |
| Tab navigation | All interactive elements are natively focusable |
| Arrow key navigation | Settings tabs support left/right arrow keys |
| Skip links | HomePage, GuestLanding, LoginPage have `<a href="#main-content">` |
| DnD Kit | KeyboardSensor with sortableKeyboardCoordinates |

---

## 6. aria-hidden Usage -- PASS

Decorative elements consistently marked:

- Navigation icons in BottomNavigation: `aria-hidden="true"`
- Emoji spans in MissionCard, MissionTypeSection: `aria-hidden="true"`
- Toggle thumbs: `aria-hidden="true"`
- Chevron/arrow icons: `aria-hidden="true"`
- `+` icons in add buttons: `aria-hidden="true"`
- Completed check icon (CommuteTrackingPage): `aria-hidden="true"` (fixed in this audit)

---

## 7. role Attribute Usage -- PASS

| Role | Component |
|------|-----------|
| `role="navigation"` | BottomNavigation |
| `role="dialog"` + `aria-modal` | ConfirmModal, EditAlertModal, LineSelectionModal, MissionAddModal, delete confirm dialogs |
| `role="switch"` + `aria-checked` | ToggleSwitch, MissionCard toggle |
| `role="alert"` | Error messages across all pages |
| `role="status"` + `aria-live="polite"` | Loading spinners, success messages |
| `role="progressbar"` | OnboardingPage, MilestoneBadgePanel, StreakBadge, BehaviorTab, MissionQuickCard |
| `role="tablist"` / `role="tab"` / `role="tabpanel"` | Settings pages, CommuteDashboardPage |
| `aria-current="page"` | Active navigation tab |
| `aria-expanded` | Collapsible sections |
| `aria-pressed` | RouteComparisonChart route buttons |
| `role="radiogroup"` / `role="radio"` | Transport selector, Line selector |
| `role="listbox"` / `role="option"` | Search results |

---

## 8. Focus Trap in Modals -- PASS

All modals use the `useFocusTrap` custom hook with ESC key handling:

| Modal | Focus Trap | ESC Key |
|-------|-----------|---------|
| ConfirmModal | Yes | Yes |
| MilestoneModal | Yes | Yes |
| MilestoneBadgePanel | Yes | Yes |
| EditAlertModal | Yes | Yes (disabled while saving) |
| DeleteConfirmModal | Yes | Yes |
| LineSelectionModal | Yes | Yes |
| MissionAddModal | Yes | Yes (disabled while saving) |
| MissionSettingsPage delete dialog | Yes (fixed) | Yes (disabled while deleting) |

---

## Fixes Applied (This Audit)

| # | File | Fix | Category |
|---|------|-----|----------|
| 1 | OnboardingPage.tsx | Added `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` to progress bar | role attributes |
| 2 | RouteComparisonChart.tsx | Replaced `<div role="button" tabIndex={0}>` with native `<button>` + `aria-pressed` + `aria-label` | Semantic HTML |
| 3 | CommuteTrackingPage.tsx | Added `aria-hidden="true"` to decorative completed check icon wrapper | aria-hidden |
| 4 | MissionSettingsPage.tsx | Added `useFocusTrap` with `onEscape` handler to delete confirm dialog | Focus trap |

**Total: 4 fixes across 4 files**

---

## Pre-existing Good Practices

The codebase had strong accessibility foundations before this audit:

- Skip links on key entry pages (HomePage, LoginPage, GuestLanding)
- `aria-hidden="true"` on decorative SVGs throughout
- `aria-label` on all icon-only buttons
- `htmlFor`/`id` connections on all form fields
- `role="dialog"` with `aria-modal` on modals
- `useFocusTrap` hook with focus save/restore
- `aria-live` regions for dynamic content
- `aria-pressed` on toggle cards
- `role="radiogroup"` / `role="radio"` for selection groups
- Keyboard sensor for drag-and-drop
- `role="alert"` on error messages
- `aria-current="page"` on active nav item
- `lang="ko"` on html element
- `useCollapsible` hook for consistent keyboard interaction on expandable sections
