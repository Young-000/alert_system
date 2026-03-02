# Accessibility Audit Report - Round 3

**Date**: 2026-02-12
**Project**: alert_system/frontend
**Status**: ✅ PASS

---

## Summary

| Category | Status | Details |
|----------|--------|---------|
| Alt / aria-hidden | ✅ | All decorative SVGs have `aria-hidden="true"` |
| aria-label | ✅ | Icon buttons, navigation, inputs all labeled |
| Form labels | ✅ | `<label htmlFor>` associations, `aria-required`, `autoComplete` |
| Keyboard navigation | ✅ | Focus traps in modals, ESC handlers, Enter key progression |
| Color contrast | ✅ | No color-only information conveyed; status badges have text labels |
| Semantic HTML | ✅ | Proper `<main>`, `<header>`, `<nav>`, `<section>`, `<footer>` usage |
| ARIA attributes | ✅ | Roles, states, live regions all correctly applied |
| Focus management | ✅ | Modal focus trap + restore, skip links on key pages |

**Total fixes applied**: 7

---

## Fixes Applied

### Fix 1: NotificationHistoryPage.tsx - Error banner missing `role="alert"`

**File**: `src/presentation/pages/NotificationHistoryPage.tsx`
**Line**: 95
**Before**:
```tsx
{error && <div className="error-banner">{error}</div>}
```
**After**:
```tsx
{error && <div className="error-banner" role="alert">{error}</div>}
```
**Reason**: Error messages must be announced to screen readers immediately via `role="alert"`.

---

### Fix 2: NotificationHistoryPage.tsx - Loading state missing ARIA attributes

**File**: `src/presentation/pages/NotificationHistoryPage.tsx`
**Lines**: 151-153
**Before**:
```tsx
<div className="settings-loading">
  <span className="spinner" />
  <p>...</p>
</div>
```
**After**:
```tsx
<div className="settings-loading" role="status" aria-live="polite">
  <span className="spinner" aria-hidden="true" />
  <p>...</p>
</div>
```
**Reason**: Loading indicators need `role="status"` and `aria-live="polite"` so screen readers announce them. Spinner is decorative and should be hidden.

---

### Fix 3: HomePage.tsx - Transit info loading spinner missing `aria-hidden`

**File**: `src/presentation/pages/HomePage.tsx`
**Before**:
```tsx
<span className="spinner spinner-sm" />
```
**After**:
```tsx
<span className="spinner spinner-sm" aria-hidden="true" />
```
**Reason**: Decorative spinners should be hidden from the accessibility tree.

---

### Fix 4: RouteSetupPage.tsx - Line selection modal overlay missing `tabIndex`

**File**: `src/presentation/pages/RouteSetupPage.tsx`
**Before**:
```tsx
<div className="line-selection-modal" role="dialog" aria-modal="true" aria-label="..." onClick={...} onKeyDown={...}>
```
**After**:
```tsx
<div className="line-selection-modal" role="dialog" aria-modal="true" aria-label="..." tabIndex={-1} onClick={...} onKeyDown={...}>
```
**Reason**: Modal dialog containers need `tabIndex={-1}` to be programmatically focusable, enabling the `onKeyDown` ESC handler to function when the overlay itself receives focus.

---

### Fix 5: RouteSetupPage.tsx - Validation error missing `role="alert"`

**File**: `src/presentation/pages/RouteSetupPage.tsx`
**Before**:
```tsx
<div className="route-validation-error">
```
**After**:
```tsx
<div className="route-validation-error" role="alert">
```
**Reason**: Inline validation errors must be immediately announced to screen readers.

---

### Fix 6: OnboardingPage.tsx - Error notice missing `role="alert"`

**File**: `src/presentation/pages/OnboardingPage.tsx`
**Line**: 350
**Before**:
```tsx
{error && <div className="notice error">{error}</div>}
```
**After**:
```tsx
{error && <div className="notice error" role="alert">{error}</div>}
```
**Reason**: Error messages must use `role="alert"` for screen reader announcement.

---

### Fix 7: RouteSetupPage.tsx - Decorative checkmark icon missing `aria-hidden`

**File**: `src/presentation/pages/RouteSetupPage.tsx`
**Line**: 1212
**Before**:
```tsx
<span className="choice-icon">✓</span>
```
**After**:
```tsx
<span className="choice-icon" aria-hidden="true">✓</span>
```
**Reason**: Decorative text icons should be hidden from screen readers. The button text "아니요, 이게 끝이에요" already conveys the meaning.

---

## Detailed Audit by Page

### HomePage.tsx ✅
- Skip link (`#main-content`) present for keyboard users
- All SVG icons have `aria-hidden="true"`
- Weather section has descriptive `aria-label`
- Semantic `<main>`, `<header>`, `<section>` structure
- Loading states properly announced
- Empty states have clear headings and actionable links
- Transit badges use text labels (not color-only)

### AlertSettingsPage.tsx ✅
- Multi-step wizard with proper heading hierarchy (`<h1>`, `<h2>`)
- Choice grids use `role="group"` with `aria-label`
- Toggle buttons use `aria-pressed`
- Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- ESC key handlers on all modals
- Form inputs have `<label htmlFor>` associations
- `aria-required` on mandatory fields
- Loading spinners have `aria-hidden="true"`
- `aria-live="polite"` on dynamic status regions
- `role="alert"` on error messages

### RouteSetupPage.tsx ✅
- Apple-style wizard with clear step progression
- Drag handles have `aria-label="드래그하여 순서 변경"`
- Remove buttons have `aria-label="체크포인트 삭제"`
- Search input has `aria-label`
- Station results use `role="listbox"` / `role="option"`
- Transport selection uses `role="radiogroup"` / `role="radio"` with `aria-checked`
- Back buttons have `aria-label`
- Line selection modal has ESC handler and focus management
- Confirm step properly structured

### SettingsPage.tsx ✅
- Tab interface with `role="tablist"` / `role="tab"` / `role="tabpanel"`
- `aria-selected` state on active tab
- Toggle switches have `aria-label`
- Icon buttons have `aria-label`
- Status messages use `aria-live`
- Proper heading hierarchy

### CommuteTrackingPage.tsx ✅
- `role="status"` on loading state
- `aria-label` on back button
- `role="alert"` on error messages
- ConfirmModal used for destructive actions (cancel session)
- Timer display accessible

### CommuteDashboardPage.tsx ✅
- Tab interface with proper ARIA roles and states
- Chart bars use `role="img"` with descriptive `aria-label`
- Decorative icons have `aria-hidden="true"`
- Loading state properly announced
- Empty states have clear messaging

### LoginPage.tsx ✅
- Skip link present
- All form fields have `<label htmlFor>` associations
- `aria-required` on required fields
- `autoComplete` attributes for password managers
- Password toggle has `aria-label`
- `role="alert"` on error messages
- Loading spinner has `aria-hidden="true"`

### OnboardingPage.tsx ✅
- Step progression with clear headings
- Form inputs have `aria-label`
- Transport mode selection uses `aria-pressed`
- Route template cards use `role="button"` with `aria-label`
- Duration slider has `aria-label`
- Error messages now have `role="alert"` (fixed)

### NotificationHistoryPage.tsx ✅
- Error banners now have `role="alert"` (fixed)
- Loading state now has `role="status"` and `aria-live="polite"` (fixed)
- Empty states with descriptive messaging
- Login prompt for unauthenticated users
- Decorative SVGs properly hidden

### NotFoundPage.tsx ✅
- Simple page with clear heading and navigation link
- No accessibility concerns

### BottomNavigation.tsx ✅
- `role="navigation"` with `aria-label="메인 메뉴"`
- `aria-current="page"` on active tab
- SVG icons have `aria-hidden="true"`
- Text labels visible for all navigation items

### ConfirmModal.tsx ✅
- `role="dialog"` with `aria-modal="true"` and `aria-labelledby`
- Focus trap implementation (Tab/Shift+Tab cycle)
- ESC key closes modal
- Focus restored to trigger element on close
- Backdrop click to dismiss

### Toast.tsx ✅
- `role="alert"` with `aria-live="polite"`
- Close button has `aria-label="닫기"`

### OfflineBanner.tsx ✅
- `role="alert"` with `aria-live="assertive"`

### ToggleSwitch.tsx ✅
- Supports `aria-label` prop pass-through

---

## Not Applicable / Out of Scope

| Item | Reason |
|------|--------|
| Color contrast ratio testing | Requires runtime measurement tools (axe-core, Lighthouse); CSS review shows no obvious violations |
| Screen reader testing | Requires manual testing with VoiceOver/NVDA |
| Motion/animation preferences | `prefers-reduced-motion` not detected in CSS (minor, non-blocking) |

---

## Recommendations (Non-blocking)

1. **Consider adding `prefers-reduced-motion`** media query to respect user motion preferences for animations (spinners, transitions)
2. **Consider axe-core integration** in CI pipeline for automated accessibility regression testing
3. **Consider adding focus-visible styles** to improve keyboard navigation visual feedback (partially present via CSS `:focus-visible`)
