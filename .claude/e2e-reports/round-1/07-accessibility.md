# 07. Accessibility (a11y) - Round 1

## Status: PASS (with fixes)

---

## Audit Scope

**Target**: `frontend/src/` (all TSX components)
**Standard**: WCAG 2.1 AA
**Checks**: 8 categories
**Files scanned**: ~100+ TSX files across presentation/pages, presentation/components, presentation/hooks

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | img alt attributes | PASS | No `<img>` tags; all visuals are inline SVGs with aria-hidden or role="img" |
| 2 | Icon button aria-label | PASS (1 fix) | SmartDepartureTab delete button was missing aria-label |
| 3 | Form field label connections | PASS | All inputs connected via htmlFor/id or aria-label |
| 4 | Semantic HTML | PASS | Extensive use of main, nav, section, header, footer, article, button |
| 5 | Skip links | PASS | Present on HomePage, LoginPage, GuestLanding |
| 6 | Focus management (modals) | PASS (2 fixes) | SmartDepartureTab and PlacesTab delete flows were missing ConfirmModal |
| 7 | div onClick patterns | PASS | Only 2 found -- both are modal overlay backdrop clicks (acceptable) |
| 8 | Color-only information | PASS | Status indicated by text + color, toggle buttons show ON/OFF text |

---

## 1. img alt Attributes -- PASS

No `<img>` tags exist in the frontend. All visual elements use inline SVG:

- **Decorative SVGs**: Marked with `aria-hidden="true"` (navigation icons, emoji spans, check marks)
- **Meaningful SVGs**: Use `role="img"` with `aria-label` (chart bars in RouteComparisonChart, DailyBarChart)

---

## 2. Icon Button aria-label -- PASS (1 fix)

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
| Settings pages | All toggle/delete buttons with aria-label |
| SmartDepartureTab | Delete button -- **fixed**: added `aria-label` with setting type + target |
| PlacesTab | Delete button has `aria-label={place.label + ' 삭제'}` |

**Fix applied**: `SmartDepartureTab.tsx` SettingCard delete button was missing `aria-label`. Added:
```tsx
aria-label={`${TYPE_LABELS[setting.departureType]} ${setting.arrivalTarget} 설정 삭제`}
```

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
| SmartDepartureTab | `htmlFor="dep-type"`, `"dep-route"`, `"dep-target"`, `"dep-prep"` |
| PlacesTab | `htmlFor="place-type"`, `"place-label"`, `"place-address"` |
| TipForm | `aria-label` on textarea |
| InsightsPage | `htmlFor="region-select"` |

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

Only 2 `<div onClick>` found -- both are modal overlay backdrop clicks (acceptable pattern per WAI-ARIA dialog pattern).

---

## 5. Skip Links -- PASS

| Page | Implementation |
|------|---------------|
| HomePage | `<a href="#main-content" className="skip-link">` |
| GuestLanding | `<a href="#main-content" className="skip-link">` |
| LoginPage | `<a href="#main-content" className="skip-link">` |

---

## 6. Focus Management (Modals) -- PASS (2 fixes)

All modals use the `useFocusTrap` custom hook with ESC key handling:

| Modal | Focus Trap | ESC Key |
|-------|-----------|---------|
| ConfirmModal | Yes | Yes (disabled while loading) |
| MilestoneModal | Yes | Yes |
| MilestoneBadgePanel | Yes | Yes |
| EditAlertModal | Yes | Yes (disabled while saving) |
| DeleteConfirmModal | Yes | Yes |
| LineSelectionModal | Yes | Yes |
| MissionAddModal | Yes | Yes (disabled while saving) |
| MissionSettingsPage delete dialog | Yes | Yes (disabled while deleting) |

**Fixes applied**:
- **SmartDepartureTab.tsx**: Delete flow was broken -- `handleDelete` was referenced but never defined, `ConfirmModal` was imported but never rendered, `actionError` was set but never displayed. Fixed by wiring up the confirm modal pattern: click delete -> show ConfirmModal -> confirm -> execute deletion. Added error display with `role="alert"`.
- **PlacesTab.tsx**: Same pattern -- `handleDelete` was referenced but undefined, `ConfirmModal` imported but not rendered. Fixed identically with ConfirmModal for delete confirmation and error display.

---

## 7. Keyboard Accessibility -- PASS

| Feature | Implementation |
|---------|---------------|
| useCollapsible hook | Provides `role="button"`, `tabIndex: 0`, `onKeyDown` (Enter/Space) |
| Tab navigation | All interactive elements are natively focusable |
| Arrow key navigation | Settings tabs support left/right arrow keys |
| Skip links | HomePage, GuestLanding, LoginPage |
| DnD Kit | KeyboardSensor with sortableKeyboardCoordinates |
| MissionsPage | `role="checkbox"` items with `onKeyDown` Enter/Space handler |

---

## 8. ARIA Attribute Usage -- PASS

| Role/Attribute | Component |
|----------------|-----------|
| `role="navigation"` | BottomNavigation |
| `role="dialog"` + `aria-modal` | ConfirmModal, EditAlertModal, LineSelectionModal, MissionAddModal, delete confirm dialogs |
| `role="switch"` + `aria-checked` | ToggleSwitch, MissionCard toggle |
| `role="alert"` | Error messages across all pages |
| `role="status"` + `aria-live="polite"` | Loading spinners, success messages |
| `role="progressbar"` | OnboardingPage, MilestoneBadgePanel, StreakBadge, BehaviorTab |
| `role="tablist"` / `role="tab"` / `role="tabpanel"` | Settings pages, CommuteDashboardPage, ReportPage |
| `aria-current="page"` | Active navigation tab |
| `aria-expanded` | Collapsible sections (WeatherHeroSection, StatsSection) |
| `aria-pressed` | RouteComparisonChart route buttons, checklist items, TipCard action buttons |
| `role="radiogroup"` / `role="radio"` | Transport selector, Line selector |
| `role="listbox"` / `role="option"` | Station search results |
| `role="img"` + `aria-label` | DailyBarChart, RouteComparisonChart |
| `role="checkbox"` + `aria-checked` | MissionsPage mission items |
| `aria-hidden="true"` | All decorative icons, emojis, SVGs |
| `sr-only` | InsightsPage screen-reader-only text |

---

## Fixes Applied (This Audit)

| # | File | Fix | Category | Severity |
|---|------|-----|----------|----------|
| 1 | SmartDepartureTab.tsx | Added `aria-label` to delete button in SettingCard | Icon button a11y | Minor |
| 2 | SmartDepartureTab.tsx | Added missing `handleDelete` function, ConfirmModal rendering, and `actionError` display with `role="alert"` | Focus management / functional bug | Critical |
| 3 | PlacesTab.tsx | Added missing `handleDelete` function, ConfirmModal rendering, and `actionError` display with `role="alert"` | Focus management / functional bug | Critical |

**Total: 3 fixes across 2 files**

> Note: Fixes #2 and #3 were also functional bugs (TypeScript compilation errors due to undefined `handleDelete`). The delete buttons in both SmartDepartureTab and PlacesTab were non-functional before these fixes. The ConfirmModal import existed but was never rendered, meaning destructive actions had no confirmation step.

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
- `role="checkbox"` with `aria-checked` and keyboard handler on mission items
- `sr-only` class for screen-reader-only descriptive text
