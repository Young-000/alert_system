# Cycle 6: UX Polish — PD P1 Resolution + Nice-to-Have Top Items

> Date: 2026-02-17
> Scope: PD-P1-1, PD-P1-2, N-3, N-15, N-16, N-13
> Total effort: 2S + 2S + 1S + 1M = ~4.5 developer-units
> Dependency order: All items are independent. Recommended execution: PD-P1-1 -> PD-P1-2 -> N-15 -> N-16 -> N-3 -> N-13

---

## JTBD

When **a user saves a commute route and the success toast appears**, they want **to navigate away immediately by tapping the toast close button**, so they can **continue using the app without waiting 1.5 seconds for the automatic redirect**.

When **a user opens the homepage and sees weather data based on Seoul defaults** (because geolocation was denied/unavailable), they want **a visible indicator saying "Seoul based"**, so they can **understand why the weather might not match their actual location and know to grant location permission**.

When **a user wants to see their past notification history**, they want **to find it easily from the main navigation or alert page**, so they **don't have to remember the hidden /notifications URL or navigate through Settings**.

When **a user sees their alert schedule displayed as "0 7 * * *"**, they want **a human-readable label like "Every day 07:00"**, so they can **understand their alert timing at a glance without knowing cron syntax**.

When **a user creates a new alert**, they want **the quick preset section to appear only in the first step**, so they **don't see redundant preset buttons that clutter the confirmation screen**.

When **a user interacts with a modal (edit alert, delete confirm, line selection)**, they want **keyboard focus to stay trapped inside the modal**, so they can **navigate with Tab/Shift+Tab without accidentally interacting with background elements**.

---

## PD-P1-1: Toast Close Triggers Immediate Navigation

### Problem

- **Who:** Any user who saves a route in RouteSetupPage
- **Pain:** After saving, a success toast appears and navigation to `/` happens after a hardcoded 1.5s `setTimeout`. If the user closes the toast early (clicks dismiss), nothing happens — they still wait.
- **Current workaround:** Wait for the timeout or manually navigate via bottom nav
- **Success metric:** Closing the toast immediately navigates to `/`

### Current State

**File:** `frontend/src/presentation/pages/RouteSetupPage.tsx` (line 369)

```typescript
setTimeout(() => navigate('/'), 1500);
```

The toast `onDismiss` callback (from `useToast`) only removes the toast from the list. It does not trigger navigation.

### Solution

1. Store the timeout ID so it can be cleared
2. Pass a custom `onDismiss` callback to `ToastContainer` that:
   - Clears the pending timeout
   - Calls `navigate('/')` immediately

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/presentation/pages/RouteSetupPage.tsx` | Store timeout ref, add dismiss-navigate logic |

### Acceptance Criteria

- [ ] **AC-1:** Given a user has just saved a route and sees a success toast, When they click the toast dismiss button, Then navigation to `/` occurs immediately (no 1.5s wait)
- [ ] **AC-2:** Given a user has just saved a route and does NOT dismiss the toast, When 1.5 seconds elapse, Then navigation to `/` occurs as before (backward compatible)
- [ ] **AC-3:** Given a user saves a route (with reverse route creation), When the success toast for "출근/퇴근 경로가 저장되었습니다" appears and is dismissed, Then navigation to `/` occurs immediately

### Task Breakdown

1. Add a `useRef<ReturnType<typeof setTimeout>>` to store the timeout ID — S — Deps: none
2. Replace bare `setTimeout` with ref-stored version; on `ToastContainer` `onDismiss`, clear timeout and call `navigate('/')` — S — Deps: 1

---

## PD-P1-2: "Seoul Based" Badge on Default Location

### Problem

- **Who:** Users who denied geolocation permission or whose browser doesn't support it
- **Pain:** Weather/air quality data is for Seoul (default fallback) but there's no visual indication. Users in Busan see Seoul weather without knowing.
- **Current workaround:** None. The `isDefault` flag exists in `useUserLocation` but is never displayed in UI.
- **Success metric:** A small badge appears near the weather section when `isDefault === true`

### Current State

**File:** `frontend/src/presentation/hooks/useUserLocation.ts` — already returns `isDefault: boolean`
**File:** `frontend/src/presentation/pages/home/use-home-data.ts` — consumes the hook but does not expose `isDefault`
**File:** `frontend/src/presentation/pages/home/WeatherHeroSection.tsx` — displays weather, has no location indicator

### Solution

1. Expose `isDefaultLocation` from `useHomeData` return type
2. Pass it to `WeatherHeroSection`
3. Render a small badge "서울 기준" next to the weather location area when `isDefaultLocation === true`
4. Badge should be tappable, linking to Settings or showing a tooltip about enabling location

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/presentation/pages/home/use-home-data.ts` | Expose `isDefaultLocation` from `userLocation.isDefault` |
| `frontend/src/presentation/pages/home/WeatherHeroSection.tsx` | Accept `isDefaultLocation` prop, render badge |
| `frontend/src/presentation/pages/home/HomePage.tsx` | Pass `isDefaultLocation` to `WeatherHeroSection` |
| `frontend/src/presentation/styles/pages/home.css` | Badge styles (small, muted, tappable) |

### Acceptance Criteria

- [ ] **AC-1:** Given a user whose geolocation is denied/unavailable, When they view the homepage weather section, Then a "서울 기준" badge is visible near the weather info
- [ ] **AC-2:** Given a user who has granted geolocation permission, When they view the homepage weather section, Then no location badge is shown
- [ ] **AC-3:** Given the location badge is visible, Then it should have `aria-label` explaining "위치 권한이 없어 서울 기준 날씨를 표시합니다" for screen readers
- [ ] **AC-4:** Given the badge is displayed, When the user taps it, Then a brief tooltip or inline message appears explaining how to enable location (e.g., "브라우저 설정에서 위치 권한을 허용하세요")

### Task Breakdown

1. Add `isDefaultLocation: boolean` to `UseHomeDataReturn` interface and return value — S — Deps: none
2. Update `WeatherHeroSection` props and render badge conditionally — S — Deps: 1
3. Add CSS for `.location-default-badge` — S — Deps: 2

---

## N-3: Notification History Page Accessibility (RICE 80, S effort)

### Problem

- **Who:** Any user who wants to review past notifications
- **Pain:** The `/notifications` page is only accessible via Settings page (buried). There's no direct link from the alerts page or bottom navigation. Users must know the URL exists.
- **Current workaround:** Navigate to Settings, find the link there
- **Success metric:** Notification history is accessible from the alerts page with one tap

### Current State

**File:** `frontend/src/presentation/components/BottomNavigation.tsx` — `/notifications` is grouped under Settings matchPaths but has no dedicated nav entry
**File:** `frontend/src/presentation/pages/AlertSettingsPage.tsx` — no link to notification history

### Solution

Add a "알림 기록" link/button within the AlertSettingsPage, near the existing alert list section header. This is more contextually relevant than adding another bottom nav tab (which would make 5 tabs).

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/presentation/pages/AlertSettingsPage.tsx` | Add "알림 기록" link near the top or as a section action |
| `frontend/src/presentation/styles/pages/alerts.css` | Style for the history link if needed |

### Acceptance Criteria

- [ ] **AC-1:** Given a logged-in user on the `/alerts` page, When they look at the page header area, Then a visible "알림 기록" link/button is present
- [ ] **AC-2:** Given the user taps "알림 기록", Then they navigate to `/notifications`
- [ ] **AC-3:** Given a user is on `/notifications`, When they tap the back button (PageHeader), Then they return to `/alerts` (or previous page)
- [ ] **AC-4:** The link has appropriate `aria-label` ("알림 발송 기록 보기")

### Task Breakdown

1. Add `Link` to `/notifications` in `AlertSettingsPage` header area — S — Deps: none
2. Verify PageHeader back navigation works from `/notifications` → `/alerts` — S — Deps: 1

---

## N-15: Cron Schedule Human-Readable Label (RICE 60, S effort)

### Problem

- **Who:** All users viewing their alert list
- **Pain:** Alert schedule is displayed as time-only ("07:00") parsed from raw cron. Users cannot tell the frequency (daily? weekdays only? custom days?). The cron string `0 7 * * 1-5` (weekdays at 7am) looks identical to `0 7 * * *` (every day at 7am) in the current UI.
- **Current workaround:** None. Users must remember what they configured.
- **Success metric:** Each alert card shows a human-readable schedule like "매일 07:00" or "평일 07:00"

### Current State

**File:** `frontend/src/presentation/pages/alert-settings/AlertList.tsx` (lines 27-30)

```typescript
const parts = alert.schedule.split(' ');
const hours = parts.length >= 2
  ? parts[1].split(',').map(h => `${h.padStart(2, '0')}:00`)
  : ['--:--'];
```

Only hours are extracted. Day-of-week (5th field) and minute (1st field) are ignored.

### Solution

Create a `cronToHuman(cron: string): string` utility function that parses a 5-field cron expression into Korean human-readable text:

| Cron | Output |
|------|--------|
| `0 7 * * *` | `매일 07:00` |
| `30 7 * * *` | `매일 07:30` |
| `0 7 * * 1-5` | `평일 07:00` |
| `0 7 * * 0,6` | `주말 07:00` |
| `0 7 * * 1,3,5` | `월,수,금 07:00` |
| `0 7,18 * * *` | `매일 07:00, 18:00` |
| `0 7 * * *` (minute != 0) | Include minutes |

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/presentation/pages/alert-settings/cron-utils.ts` | New file: `cronToHuman()` utility |
| `frontend/src/presentation/pages/alert-settings/cron-utils.test.ts` | New file: unit tests |
| `frontend/src/presentation/pages/alert-settings/AlertList.tsx` | Replace raw cron parsing with `cronToHuman()` |
| `frontend/src/presentation/pages/alert-settings/index.ts` | Export new utility |

### Acceptance Criteria

- [ ] **AC-1:** Given an alert with schedule `0 7 * * *`, When displayed in the alert list, Then the time shows "매일 07:00"
- [ ] **AC-2:** Given an alert with schedule `0 7 * * 1-5`, When displayed, Then the time shows "평일 07:00"
- [ ] **AC-3:** Given an alert with schedule `0 7 * * 0,6`, When displayed, Then the time shows "주말 07:00"
- [ ] **AC-4:** Given an alert with schedule `0 7,18 * * *`, When displayed, Then the time shows "매일 07:00, 18:00"
- [ ] **AC-5:** Given an invalid or unparseable cron string, When displayed, Then fallback to the raw schedule string (no crash)
- [ ] **AC-6:** `cronToHuman` has unit tests covering all patterns above plus edge cases

### Task Breakdown

1. Create `cron-utils.ts` with `cronToHuman()` function — S — Deps: none
2. Write `cron-utils.test.ts` with at least 8 test cases — S — Deps: 1
3. Update `AlertList.tsx` to use `cronToHuman()` — S — Deps: 1

---

## N-16: QuickPresets Deduplication — Wizard Step 1 Only (RICE 60, S effort)

### Problem

- **Who:** Users creating a new alert via the wizard
- **Pain:** The `QuickPresets` component renders at the bottom of `AlertSettingsPage` regardless of wizard state. This means presets are visible during all wizard steps including the confirmation step, creating visual noise and potential confusion.
- **Current workaround:** None. Users just ignore the redundant presets section.
- **Success metric:** QuickPresets only appear when the wizard is NOT active (i.e., in the alert list view)

### Current State

**File:** `frontend/src/presentation/pages/AlertSettingsPage.tsx` (lines 406-411)

```tsx
{/* 빠른 알림 프리셋 */}
<QuickPresets
  alerts={alertCrud.alerts}
  isSubmitting={alertCrud.isSubmitting}
  onQuickWeather={alertCrud.handleQuickWeatherAlert}
/>
```

This renders unconditionally after the wizard section.

### Solution

Wrap `QuickPresets` in a condition: only show when the wizard is NOT active (when user is viewing the alert list, not in creation flow).

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/presentation/pages/AlertSettingsPage.tsx` | Conditionally render `QuickPresets` only when wizard is not active |

### Acceptance Criteria

- [ ] **AC-1:** Given a user is on `/alerts` viewing their alert list (no wizard active), Then QuickPresets section is visible below the list
- [ ] **AC-2:** Given a user has started the alert creation wizard (any step), Then QuickPresets section is NOT visible
- [ ] **AC-3:** Given a user cancels the wizard and returns to the list view, Then QuickPresets section reappears

### Task Breakdown

1. Identify wizard active state variable and wrap `QuickPresets` in conditional — S — Deps: none

---

## N-13: Focus Trap for All Modals (RICE 60, M effort)

### Problem

- **Who:** Keyboard users, screen reader users, accessibility-conscious users
- **Pain:** Three modals lack focus trapping: `EditAlertModal`, `DeleteConfirmModal`, `LineSelectionModal`. When these are open, Tab key can move focus to background elements. Only `ConfirmModal` has proper focus trap implementation.
- **Current workaround:** Mouse users don't notice. Keyboard users may lose focus context.
- **Success metric:** All modals trap focus within their boundaries and restore focus on close

### Current State

| Modal | Focus Trap | ESC Key | Focus Restore |
|-------|:----------:|:-------:|:-------------:|
| `ConfirmModal.tsx` (shared component) | YES | YES | YES |
| `EditAlertModal.tsx` | NO | NO | NO |
| `DeleteConfirmModal.tsx` | NO | NO | NO |
| `LineSelectionModal.tsx` | Partial (ESC via onKeyDown) | YES | NO |

### Solution

Extract the focus trap logic from `ConfirmModal` into a reusable `useFocusTrap` hook, then apply it to all three modals.

### Hook Design

```typescript
// frontend/src/presentation/hooks/useFocusTrap.ts
function useFocusTrap(options: {
  active: boolean;
  onEscape?: () => void;
}): RefObject<HTMLDivElement>
```

Behavior:
1. On activation: save `document.activeElement`, focus first focusable element inside ref
2. On Tab/Shift+Tab: cycle focus within the modal
3. On Escape: call `onEscape` callback
4. On deactivation: restore previous focus

### Files to Modify

| File | Change |
|------|--------|
| `frontend/src/presentation/hooks/useFocusTrap.ts` | New file: reusable hook extracted from ConfirmModal logic |
| `frontend/src/presentation/hooks/useFocusTrap.test.ts` | New file: unit tests |
| `frontend/src/presentation/pages/alert-settings/EditAlertModal.tsx` | Add `useFocusTrap` |
| `frontend/src/presentation/pages/alert-settings/DeleteConfirmModal.tsx` | Add `useFocusTrap` |
| `frontend/src/presentation/pages/route-setup/LineSelectionModal.tsx` | Add `useFocusTrap`, remove inline ESC handler |
| `frontend/src/presentation/components/ConfirmModal.tsx` | Refactor to use `useFocusTrap` (reduce duplication) |

### Acceptance Criteria

- [ ] **AC-1:** Given `EditAlertModal` is open, When the user presses Tab repeatedly, Then focus cycles within the modal (name input -> time input -> cancel button -> save button -> name input)
- [ ] **AC-2:** Given `DeleteConfirmModal` is open, When the user presses Shift+Tab on the first focusable element, Then focus wraps to the last focusable element
- [ ] **AC-3:** Given `LineSelectionModal` is open, When the user presses Escape, Then the modal closes
- [ ] **AC-4:** Given any modal is closed, Then focus returns to the element that was focused before the modal opened
- [ ] **AC-5:** Given `EditAlertModal` is open, When the user presses Escape, Then the modal closes (onCancel is called)
- [ ] **AC-6:** `ConfirmModal` continues to work identically after refactoring to use `useFocusTrap` (no regression)
- [ ] **AC-7:** `useFocusTrap` has unit tests covering: focus on open, Tab wrap, Shift+Tab wrap, ESC key, focus restore on close

### Task Breakdown

1. Create `useFocusTrap.ts` hook extracting logic from `ConfirmModal` — M — Deps: none
2. Write `useFocusTrap.test.ts` — S — Deps: 1
3. Refactor `ConfirmModal.tsx` to use `useFocusTrap` — S — Deps: 1
4. Apply `useFocusTrap` to `EditAlertModal.tsx` — S — Deps: 1
5. Apply `useFocusTrap` to `DeleteConfirmModal.tsx` — S — Deps: 1
6. Apply `useFocusTrap` to `LineSelectionModal.tsx` — S — Deps: 1

---

## Scope (MoSCoW)

**Must:**
- PD-P1-1: Toast dismiss triggers immediate navigation
- PD-P1-2: "서울 기준" badge on default location
- N-15: Cron schedule human-readable labels
- N-16: QuickPresets conditional rendering

**Should:**
- N-3: Notification history accessibility from alerts page
- N-13: Focus trap for all modals

**Could:**
- Tooltip on "서울 기준" badge explaining how to enable location
- `cronToHuman` support for month/day-of-month patterns (not currently used)

**Won't (this cycle):**
- N-11: Home page cognitive load reduction (L effort — deferred to Cycle 7+)
- N-1: Jest -> Vitest migration (separate infrastructure task)
- Custom domain setup (N-9)

---

## Test Requirements

| Item | Test Type | Minimum Test Count |
|------|-----------|:------------------:|
| PD-P1-1 | Manual verification (timeout + dismiss) | 0 (manual) |
| PD-P1-2 | Existing `useUserLocation.test.ts` covers `isDefault` logic | 0 (covered) |
| N-15 | Unit tests for `cronToHuman()` | 8+ |
| N-16 | Manual verification | 0 (manual) |
| N-3 | Manual verification (link renders, navigates) | 0 (manual) |
| N-13 | Unit tests for `useFocusTrap` hook | 5+ |

**Total new tests:** 13+ (8 cron-utils + 5 focus-trap)

---

## Definition of Done

1. All 6 items implemented per acceptance criteria above
2. `npm run lint` passes with 0 errors
3. `npm run typecheck` (tsc --noEmit) passes
4. `npm run test` passes (all existing + new tests)
5. `npm run build` succeeds
6. No new `eslint-disable` comments introduced
7. PD review: APPROVE on toast navigation, location badge, and schedule labels
8. QA verification: 0 blockers, focus trap works on all 4 modals

---

## Open Questions

- **PD-P1-2 badge interaction:** Should tapping the "서울 기준" badge attempt to re-request geolocation permission, or just show an informational tooltip? (Spec assumes tooltip; re-request can be a follow-up.)
- **N-15 day-of-week naming:** For custom day patterns like `1,3,5`, should we show "월,수,금" or "월/수/금"? (Spec assumes comma-separated.)

---

## Out of Scope

- **N-11 (Home cognitive load reduction):** L-effort item, too large for this cycle alongside 6 other items
- **Bottom navigation changes:** Adding a 5th tab for notifications was considered but rejected — 4 tabs is the UX sweet spot for mobile
- **Cron editor UI:** The cron-to-human utility is read-only display; editing cron via UI is a separate feature
- **Modal animation:** Focus trap is functional, not visual. Enter/exit animations are a separate concern

---

*Last updated: 2026-02-17 (Cycle 6 spec created)*
