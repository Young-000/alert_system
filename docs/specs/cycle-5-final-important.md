# Cycle 5: Final Important + High-Value Nice-to-Have

> Date: 2026-02-17
> Scope: I-6, I-2, N-12, N-14, N-5
> Dependency order: I-6 (independent) | N-5 (independent) | N-14 (independent) | N-12 (independent) | I-2 (independent, do last — pure refactor, biggest risk)

---

## JTBD

When **a commuter opens the app from a location outside Seoul**, they want **weather and air quality data for their actual location**, so they can **make outfit and departure decisions based on local conditions instead of irrelevant Seoul data**.

When **a developer needs to fix a CSS bug on the routes page**, they want to **open a focused CSS file for that page**, so they can **find the relevant styles in seconds instead of scrolling through 16,838 lines**.

When **a user saves a new commute route**, they want **clear visual confirmation that it was saved**, so they can **trust the system worked and confidently move on to the next step**.

When **a user opens Settings and sees route/alert lists**, they want to **manage those items on their dedicated pages with full functionality**, so they **don't encounter a stripped-down duplicate UI with missing features**.

When **a developer reads the codebase**, they want **zero eslint-disable comments**, so they can **trust the dependency arrays are correct and avoid hidden bugs**.

---

## I-6: Remove Hardcoded Seoul Coordinates (RICE 128, M effort)

### Problem

- **Who:** Any user not in central Seoul (Bundang, Incheon, Busan, etc.)
- **Pain:** Weather and air quality data are always for Seoul City Hall (37.5665, 126.978). A Bundang commuter sees Seoul weather, which can differ significantly.
- **Current workaround:** None. Users cannot change their location.
- **Success metric:** App uses browser geolocation with Seoul as fallback; coordinates stored in localStorage for fast subsequent loads.

### Current State — Hardcoded Coordinates Inventory

| # | File | Line | Value | Usage |
|---|------|------|-------|-------|
| 1 | `frontend/src/presentation/pages/home/use-home-data.ts` | 115-116 | `lat = 37.5665; lng = 126.978` | Weather + Air Quality API calls |
| 2 | `backend/src/presentation/controllers/weather.controller.ts` | 23-24 | `parseFloat(lat \|\| '37.5665')` | Backend fallback for missing query params |

Backend test files (`*.spec.ts`) use `37.5665, 126.978` as fixture data -- these are **acceptable** and should NOT be changed (they are test constants, not production logic).

### Solution

#### 1. Create `useUserLocation` hook

**File:** `frontend/src/presentation/hooks/useUserLocation.ts` (new)

```typescript
const SEOUL_DEFAULT = { latitude: 37.5665, longitude: 126.978 };
const STORAGE_KEY = 'user-location';

interface UserLocation {
  latitude: number;
  longitude: number;
  isDefault: boolean;
  isLoading: boolean;
}
```

Hook behavior:
1. On mount, check `localStorage` for cached position. If found, return it immediately (`isDefault: false`, `isLoading: true` while refreshing).
2. Call `navigator.geolocation.getCurrentPosition()` with `{ timeout: 5000, maximumAge: 300000 }`.
3. On success: update state and `localStorage`. Set `isDefault: false`.
4. On error (denied/timeout/unavailable): use Seoul default. Set `isDefault: true`.
5. Return `{ latitude, longitude, isDefault, isLoading }`.

#### 2. Update `use-home-data.ts`

**File:** `frontend/src/presentation/pages/home/use-home-data.ts` (lines 110-127)

- Import `useUserLocation` from hooks.
- Replace hardcoded `lat`/`lng` with values from the hook.
- Add `latitude` and `longitude` to useEffect dependency array (so weather refreshes when location changes).
- The hook's `isLoading` state can be used to show a brief skeleton on the weather card.

```typescript
// Before (line 115-116):
const lat = 37.5665;
const lng = 126.978;

// After:
// (at hook level, outside useEffect)
const location = useUserLocation();
// (inside useEffect, use location.latitude, location.longitude)
```

#### 3. Backend fallback unchanged

The backend `weather.controller.ts` already accepts `lat`/`lng` as query params and falls back to Seoul. This is correct behavior -- the frontend will now pass real coordinates, and the backend default handles edge cases (direct API calls without params).

### Scope (MoSCoW)

**Must:**
- `useUserLocation` hook with geolocation + localStorage cache + Seoul fallback
- Replace hardcoded coords in `use-home-data.ts`
- Frontend passes `lat`/`lng` to weather and air quality API calls dynamically

**Should:**
- Show a subtle indicator when using default location (e.g., "서울 기준" badge on weather card)
- Unit tests for the hook (mock `navigator.geolocation`)

**Could:**
- Settings page location override (manual address input)
- Location permission prompt UI (explain why we need it)

**Won't (this cycle):**
- Backend user.location field update (exists in DB but not wired to weather)
- Reverse geocoding (showing city name from coordinates)

### Acceptance Criteria

- [ ] Given a user on a device with geolocation enabled, When they open the home page, Then weather/air quality APIs are called with their actual coordinates (not 37.5665/126.978)
- [ ] Given a user who denied geolocation permission, When they open the home page, Then Seoul coordinates are used as fallback and the app functions normally
- [ ] Given a user who previously granted geolocation, When they open the app again, Then cached coordinates from localStorage are used immediately (no loading delay)
- [ ] Given the `useUserLocation` hook, When geolocation succeeds, Then `isDefault` is `false` and `isLoading` transitions from `true` to `false`
- [ ] Given the `useUserLocation` hook, When geolocation fails, Then `isDefault` is `true` and Seoul coordinates are returned
- [ ] Given no hardcoded `37.5665` or `126.978` in `use-home-data.ts`, When searching the frontend/src (excluding tests), Then zero matches are found for these constants outside the hook's default definition

### Task Breakdown

1. **Create `useUserLocation` hook** — S — Deps: none
2. **Write unit tests for `useUserLocation`** — S — Deps: 1
3. **Update `use-home-data.ts` to use hook** — S — Deps: 1
4. **Add `isDefault` indicator to weather card** (optional) — S — Deps: 3

### Risk: LOW
- Geolocation API is well-supported in all modern browsers
- Seoul fallback ensures zero-breakage for users who deny permission
- Backend already accepts dynamic coordinates

---

## N-5: Resolve eslint-disable Comments (RICE 80, S effort)

### Problem

- **Who:** Developers maintaining the codebase
- **Pain:** 2 `eslint-disable-next-line react-hooks/exhaustive-deps` comments suppress dependency warnings, hiding potential stale closure bugs
- **Current workaround:** Suppressed with eslint-disable
- **Success metric:** Zero eslint-disable comments in `frontend/src/`

### Current State — Full eslint-disable Inventory

| # | File | Line | Rule Disabled | Root Cause |
|---|------|------|---------------|------------|
| 1 | `AlertSettingsPage.tsx` | 138 | `react-hooks/exhaustive-deps` | `useCallback` dependency array is missing: `alertCrud.setError`, `alertCrud.setDuplicateAlert`, `alertCrud.setIsSubmitting`, `alertCrud.setSuccess`, `alertCrud.reloadAlerts`, `wizard.setStep`, `setWantsWeather`, `setWantsTransport`, `setTransportTypes`, `transportSearch.setSelectedTransports`, `transportSearch.setSearchQuery`, `setSelectedRouteId` |
| 2 | `CommuteTrackingPage.tsx` | 109 | `react-hooks/exhaustive-deps` | `useEffect` dependency array is missing: `navigate`, `commuteApi`, `navState`, `searchParams` |

### Solution

#### Site 1: `AlertSettingsPage.tsx` line 138

The `handleSubmit` `useCallback` lists 7 deps but references ~12 more. The missing deps are all **state setters** (stable by React guarantee) and **object method references** (from custom hooks).

**Fix approach:**
- State setters (`setWantsWeather`, `setWantsTransport`, `setTransportTypes`, `setSelectedRouteId`) are **stable** (React guarantees identity). Adding them to deps is safe and satisfies the lint rule.
- `alertCrud` methods (`setError`, `setDuplicateAlert`, `setIsSubmitting`, `setSuccess`, `reloadAlerts`) come from `useAlertCrud`. Check if the hook wraps them in `useCallback`. If yes, safe to add. If not, wrap them first.
- `wizard.setStep` comes from `useWizardNavigation`. Same check needed.
- `transportSearch.setSelectedTransports`, `transportSearch.setSearchQuery` come from `useTransportSearch`. Same check needed.

**Action:** Add all missing deps to the array and remove the eslint-disable. Since React state setters are stable and custom hook callbacks should be wrapped in `useCallback`, this should not cause re-render loops. If any custom hook doesn't use `useCallback` for its returned functions, wrap them.

#### Site 2: `CommuteTrackingPage.tsx` line 109

The `useEffect` runs on `[userId]` but references `navigate`, `commuteApi`, `navState`, `searchParams`.

**Fix approach:**
- `navigate` — stable ref from `useNavigate()` (React Router guarantees).
- `commuteApi` — created via `useMemo(() => getCommuteApiClient(), [])` on line 16. Stable.
- `navState` — from `location.state`. Changes when location changes. **This is the real concern.** If added to deps, the effect re-runs when navigation state changes, which is actually desired behavior (e.g., navigating to commute with a new routeId).
- `searchParams` — from `useSearchParams()`. Changes when URL params change.

**Action:** Add `navigate`, `commuteApi`, `searchParams` to deps. For `navState`, since it's derived from `location.state`, add `location.state` to deps (or restructure to use `searchParams` only). Remove the eslint-disable.

**Important:** Verify the effect doesn't infinite-loop by testing the commute page flow manually after the fix.

### Scope (MoSCoW)

**Must:**
- Remove both eslint-disable comments
- Add correct dependencies to both hooks
- Verify custom hooks use `useCallback` for returned functions

**Should:**
- Add `useCallback` wrappers in custom hooks if missing

**Won't:**
- Restructure the effects (minimal change principle)

### Acceptance Criteria

- [ ] Given the codebase, When running `grep -r "eslint-disable" frontend/src/`, Then zero results are returned
- [ ] Given `AlertSettingsPage.tsx`, When the `handleSubmit` callback dependency array is updated, Then ESLint reports no warnings for that file
- [ ] Given `CommuteTrackingPage.tsx`, When the useEffect dependency array is updated, Then ESLint reports no warnings for that file
- [ ] Given the commute tracking page, When a user navigates to `/commute?routeId=xxx`, Then the correct route loads and session starts (no regression)
- [ ] Given the alert settings page, When a user creates a new alert, Then submission works correctly (no regression)

### Task Breakdown

1. **Audit custom hook callbacks** (`useAlertCrud`, `useWizardNavigation`, `useTransportSearch`) for `useCallback` usage — S — Deps: none
2. **Add `useCallback` to any unwrapped hook functions** — S — Deps: 1
3. **Fix `AlertSettingsPage.tsx` deps + remove eslint-disable** — S — Deps: 2
4. **Fix `CommuteTrackingPage.tsx` deps + remove eslint-disable** — S — Deps: none (independent)
5. **Run ESLint + manual flow test** — S — Deps: 3, 4

### Risk: MEDIUM
- Changing dependency arrays can cause re-render loops if hook functions aren't stable
- Mitigation: Audit all hook return values for stability first
- Mitigation: Test both pages manually after changes

---

## N-14: Route Save Success Toast (RICE 80, S effort)

### Problem

- **Who:** Users who save a new commute route
- **Pain:** After saving a route, the user is immediately `navigate('/')`-d to home with no confirmation. They must assume it saved because the page changed.
- **Current workaround:** Users navigate to Settings > Routes to verify the route was saved.
- **Success metric:** A success toast appears after every route save before navigation.

### Current State

**File:** `frontend/src/presentation/pages/RouteSetupPage.tsx` lines 312-368

```typescript
// Current flow:
const handleSave = async () => {
  // ... validation, save logic ...
  await commuteApi.createRoute(dto);
  // ... reverse route creation ...
  navigate('/');  // <-- Immediate redirect, no feedback!
};
```

The `Toast` component and `useToast` hook already exist at:
- `frontend/src/presentation/components/Toast.tsx`
- Exports: `Toast`, `ToastContainer`, `useToast` (hook with `success()`, `error()`, `info()`, `warning()` helpers)

### Solution

1. Import `useToast` and `ToastContainer` in `RouteSetupPage.tsx`
2. After successful save (line 362), show toast **before** navigating
3. Delay navigation by ~1.5 seconds so the user sees the toast
4. For edit flow: show "경로가 수정되었습니다" instead of "경로가 저장되었습니다"
5. For dual-save (morning + reverse evening): show "출근/퇴근 경로가 저장되었습니다"

```typescript
// After:
const toast = useToast();

const handleSave = async () => {
  // ... save logic ...

  if (editingRoute) {
    toast.success('경로가 수정되었습니다');
  } else if (routeType === 'morning' && createReverse) {
    toast.success('출근/퇴근 경로가 저장되었습니다');
  } else {
    toast.success('경로가 저장되었습니다');
  }

  setTimeout(() => navigate('/'), 1500);
};

// In JSX, add <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
```

### Also check for other missing success feedback

| Page | Save Action | Current Feedback | Needs Fix? |
|------|------------|-----------------|:----------:|
| `RouteSetupPage.tsx` | Create/edit route | None (immediate redirect) | YES |
| `AlertSettingsPage.tsx` | Create alert | "알림이 설정되었습니다!" via `alertCrud.setSuccess()` | NO (has feedback) |
| `SettingsPage` (via `use-settings.ts`) | Delete route/alert | Modal close + list refresh | Acceptable |
| `CommuteTrackingPage.tsx` | Complete session | Redirects to dashboard with stats | Acceptable |

Only `RouteSetupPage.tsx` needs the toast addition.

### Scope (MoSCoW)

**Must:**
- Toast on successful route creation
- Toast on successful route edit
- Delayed navigation (1.5s) so user sees the toast

**Should:**
- Distinct messages for create vs edit vs dual-save

**Won't:**
- Toast on route deletion (already handled by ConfirmModal in SettingsPage)

### Acceptance Criteria

- [ ] Given a user creates a new route, When the save succeeds, Then a success toast "경로가 저장되었습니다" appears for ~1.5 seconds before navigating to home
- [ ] Given a user edits an existing route, When the save succeeds, Then a success toast "경로가 수정되었습니다" appears
- [ ] Given a user creates a morning route with reverse, When the save succeeds, Then a success toast "출근/퇴근 경로가 저장되었습니다" appears
- [ ] Given the toast is showing, When the user taps the close button on the toast, Then the toast dismisses and navigation happens immediately
- [ ] Given a save failure, When the catch block runs, Then the existing error message ("저장에 실패했습니다") still appears (no regression)

### Task Breakdown

1. **Add `useToast` + `ToastContainer` to `RouteSetupPage.tsx`** — S — Deps: none
2. **Replace `navigate('/')` with toast + delayed navigation** — S — Deps: 1
3. **Add distinct messages for edit/create/dual-save** — S — Deps: 2

### Risk: LOW
- Toast component already exists and is proven
- Only 1 file changes
- Navigation delay is the only UX consideration (1.5s is short enough)

---

## N-12: Deduplicate Settings Routes/Alerts Tabs (RICE 100, M effort)

### Problem

- **Who:** Users who see route and alert lists in both Settings and their dedicated pages
- **Pain:** `SettingsPage > RoutesTab` shows a mini route list with delete and start-tracking buttons. `RouteSetupPage` shows a full route list with edit, delete, share, and create. Users may be confused about which is the "real" management page. Same duplication exists for alerts.
- **Current workaround:** Power users learn to use the dedicated pages; casual users may never discover full functionality.
- **Success metric:** Settings tabs become simple "shortcut hubs" that link to dedicated pages instead of duplicating functionality.

### Current State

**`settings/RoutesTab.tsx`** (66 lines):
- Shows route list with type badge, checkpoint summary, start-tracking link, delete button
- "추가" link to `/routes`
- Empty state with "경로 추가하기" link to `/routes`

**`settings/AlertsTab.tsx`** (78 lines):
- Shows alert list with name, time badge, type tags, toggle switch, delete button
- "추가" link to `/alerts`
- Empty state with "알림 설정하기" link to `/alerts`

**Dedicated pages already have full functionality:**
- `RouteSetupPage.tsx` + `RouteListView.tsx`: Full route management (create, edit, delete, share, reorder, reverse)
- `AlertSettingsPage.tsx` + `AlertList.tsx`: Full alert management (create, edit, delete, toggle, wizard)

### Solution

Replace the duplicated list UIs with clean "shortcut cards":

#### RoutesTab.tsx — Simplified

```tsx
export function RoutesTab({ routeCount }: { routeCount: number }): JSX.Element {
  return (
    <div role="tabpanel" id="tabpanel-routes" aria-labelledby="tab-routes">
      <section className="settings-section">
        <h2 className="section-title">경로 관리</h2>
        <p className="section-description">
          출퇴근 경로를 추가하고 관리하세요.
        </p>
        <div className="settings-shortcut">
          <div className="shortcut-info">
            <span className="shortcut-count">{routeCount}개</span>
            <span className="shortcut-label">등록된 경로</span>
          </div>
          <Link to="/routes" className="btn btn-primary">
            경로 관리 바로가기
          </Link>
        </div>
      </section>
    </div>
  );
}
```

#### AlertsTab.tsx — Simplified

Same pattern: show count + link to `/alerts`.

#### Props Simplification

**Before:** `RoutesTab` needs `routes: RouteResponse[]`, `onDeleteRoute: (...)`.
**After:** `RoutesTab` needs only `routeCount: number`.

**Before:** `AlertsTab` needs `alerts: Alert[]`, `onToggleAlert`, `onDeleteAlert`, `formatScheduleTime`.
**After:** `AlertsTab` needs only `alertCount: number`.

This also simplifies `SettingsPage.tsx` and `use-settings.ts` — they no longer need delete/toggle handlers for routes/alerts on the settings page.

#### use-settings.ts Cleanup

Remove from the hook:
- `onDeleteRoute` handler logic (settings-specific)
- `onToggleAlert` handler logic (settings-specific)
- `deleteModal` state (no longer needed on settings)
- `isDeleting` state
- `formatScheduleTime` function (move to alert-settings if not already there)

Keep:
- Fetching `alerts` and `routes` (needed for counts)
- Or simplify to just fetch counts

### Scope (MoSCoW)

**Must:**
- Replace RoutesTab list with shortcut card + link to `/routes`
- Replace AlertsTab list with shortcut card + link to `/alerts`
- Remove delete/toggle handlers from use-settings.ts that are now unnecessary
- Remove ConfirmModal dependency from SettingsPage (for route/alert deletion)

**Should:**
- Show route/alert counts in the shortcut cards
- Add minimal CSS for `.settings-shortcut` card style

**Could:**
- Show latest route/alert name as preview text
- Quick-toggle for the primary alert directly in settings

**Won't:**
- Move any logic to dedicated pages (they already have it)
- Change the dedicated pages themselves

### Acceptance Criteria

- [ ] Given a user opens Settings > Routes tab, When the tab renders, Then they see a count ("3개 등록된 경로") and a "경로 관리 바로가기" button linking to `/routes`
- [ ] Given a user opens Settings > Alerts tab, When the tab renders, Then they see a count and a "알림 관리 바로가기" button linking to `/alerts`
- [ ] Given the new RoutesTab, When rendered, Then it does NOT contain inline delete buttons, toggle switches, or checkpoint summaries
- [ ] Given `use-settings.ts`, When the hook is audited, Then `deleteModal`, `isDeleting`, `onDeleteRoute`, `onToggleAlert` related code is removed or simplified
- [ ] Given a user clicks "경로 관리 바로가기", When the link activates, Then they navigate to `/routes` and see the full route management UI
- [ ] Given a user clicks "알림 관리 바로가기", When the link activates, Then they navigate to `/alerts` and see the full alert management UI
- [ ] Given the SettingsPage, When there are 0 routes and 0 alerts, Then both tabs show appropriate empty-state text with links to the dedicated pages

### Task Breakdown

1. **Simplify `RoutesTab.tsx`** — replace list with shortcut card — S — Deps: none
2. **Simplify `AlertsTab.tsx`** — replace list with shortcut card — S — Deps: none
3. **Update `SettingsPage.tsx`** — pass simplified props — S — Deps: 1, 2
4. **Clean up `use-settings.ts`** — remove unused handlers — M — Deps: 3
5. **Add `.settings-shortcut` CSS** — S — Deps: 1
6. **Remove unused imports/types** from SettingsPage — S — Deps: 4

### Risk: LOW
- No functionality is being removed from the app; it's just being consolidated to the dedicated pages where it already exists
- The Settings page becomes simpler (fewer props, less code, less testing surface)

---

## I-2: CSS Modularization Phase 1 (RICE 53, L effort)

### Problem

- **Who:** Developers who need to modify styles
- **Pain:** `frontend/src/presentation/index.css` is **16,838 lines** in a single file. Finding relevant styles requires extensive scrolling or searching. Section comments help but are insufficient for a file this large.
- **Current workaround:** Ctrl+F with section headers like `/* ========== COMMUTE TRACKING STYLES ==========*/`
- **Success metric:** index.css becomes a hub file with `@import` statements; no file > 3,000 lines; zero visual regressions.

### Current State

**File:** `frontend/src/presentation/index.css` — 16,838 lines
**Imported from:** `frontend/src/main.tsx` line 4: `import './presentation/index.css'`

The file has clear section boundaries marked with `/* ========== SECTION ========== */` comments. Here is the natural split plan based on actual section boundaries:

### Proposed File Structure

```
frontend/src/presentation/styles/
  index.css          (hub: @import statements only, ~20 lines)
  base.css           (lines 1-219: reset, variables, focus, a11y, typography)
  components.css     (lines 220-2826: layout, nav, cards, chips, badges, avatars, grids, buttons, utilities, dividers, lists, accordion, tabs, forms, notices, offline, toast, auth, tooltip, animations, spinner, skeleton, toggle, modal, responsive-base, scrollbar, selection, circular-progress)
  pages/
    alerts.css       (lines 2877-4527: wizard, search, routine, schedule, confirm, alert list, mobile wizard, empty state, time picker, keyboard hint, error, touch, footer, print)
    home.css         (lines 4590-4855 + 8570-9475 + 12406-13859 + 14791-16838: toast dup, settings cards, home layouts, dashboard, commute phases, guest hero, responsive dashboard, bottom nav, weather, transit, home actions, stats, settings, toggle, icon buttons, alert list improvements, route import, quick select, route list, dashboard improvements, nav settings, mobile responsive, page header, auth required, line chip, toggle switch, analytics, UX improvements, departure prediction, route comparison, behavior patterns)
    routes.css       (lines 4858-5175 + 6533-7868 + 9476-10265 + 10881-11202 + 13383-13750: route setup, checkpoints, station search, timing, summary, route setup v2, route list v2, DnD, validation, reverse route, line selection, comparison chart)
    commute.css      (lines 5232-6532 + 10266-10880 + 11203-12405 + 15806-16063: commute tracking, checkpoint progress v2, dashboard, commute page v2, DnD/transport/search/stopwatch/progress/checkpoint/step/time/preview/toast/empty/stat/chart/history/route-preview/confirm-modal improvements)
    settings.css     (lines 12746-13382: settings page specific)
    auth.css         (lines 8196-8569: onboarding, welcome, steps)
    notification-history.css (lines 14628-14790: notification history page, shared route banner)
```

### Implementation Strategy

**CRITICAL CONSTRAINT:** This is a **pure file split**. Zero class renames, zero style changes, zero specificity modifications. The only change is moving CSS rules from one file to multiple files.

**Approach:**
1. Create `frontend/src/presentation/styles/` directory
2. Split sections into individual files based on section comment boundaries
3. Create new `index.css` with only `@import` statements
4. Update `main.tsx` import path: `import './presentation/styles/index.css'`
5. Visual regression test: screenshot comparison before/after

**New `styles/index.css`:**
```css
@import './base.css';
@import './components.css';
@import './pages/alerts.css';
@import './pages/home.css';
@import './pages/routes.css';
@import './pages/commute.css';
@import './pages/settings.css';
@import './pages/auth.css';
@import './pages/notification-history.css';
```

### Handling Duplicated/Scattered Sections

The CSS has several challenges:
1. **Duplicate sections:** "Toast Notifications" appears at line 1941 AND line 4590. Both must go to `components.css` (or the second one checked for duplicates and merged).
2. **Scattered page styles:** Home page styles are spread across 4+ non-contiguous blocks. All must be gathered into `pages/home.css`.
3. **UX improvement block** (line 14791+): Contains styles for multiple pages. Must be split by page context.

**Strategy for scattered blocks:** Rather than extracting exact line ranges, identify each CSS rule's target page by its class name prefix and move accordingly:
- `.wizard-*`, `.alert-*`, `.routine-*` → `pages/alerts.css`
- `.route-*`, `.checkpoint-*`, `.station-*` → `pages/routes.css`
- `.commute-*`, `.tracking-*`, `.session-*` → `pages/commute.css`
- `.settings-*` → `pages/settings.css`
- `.onboarding-*`, `.auth-*` → `pages/auth.css`
- `.dashboard-*`, `.home-*`, `.hero-*`, `.departure-*`, `.weather-*`, `.today-*` → `pages/home.css`
- Everything else (shared components) → `components.css`

### Scope (MoSCoW)

**Must:**
- Split into 9 files (1 base + 1 components + 7 page files)
- New hub `index.css` with `@import` only
- Update `main.tsx` import path
- Zero visual regressions (verified by build + screenshot)
- Zero class renames or style changes

**Should:**
- Deduplicate the 2 toast sections (merge into `components.css`)
- Each file has a header comment describing its contents
- Files are < 3,000 lines each

**Could:**
- Further split `components.css` if it exceeds 3,000 lines (buttons.css, forms.css, etc.)

**Won't (this cycle):**
- CSS Modules or CSS-in-JS migration
- Class renaming or BEM convention
- Tailwind migration (separate future effort)
- Style changes of any kind

### Acceptance Criteria

- [ ] Given the new file structure, When `main.tsx` imports `styles/index.css`, Then the app builds successfully with zero errors
- [ ] Given the split files, When all `@import` statements are resolved, Then the total CSS output is byte-for-byte identical to the original (after whitespace normalization)
- [ ] Given `frontend/src/presentation/index.css`, When checked after the migration, Then it no longer exists (replaced by `styles/index.css`)
- [ ] Given any single split file, When its line count is checked, Then it is < 3,000 lines
- [ ] Given the app in a browser, When comparing screenshots before and after the split, Then zero visual differences are detected on home, routes, alerts, commute, and settings pages
- [ ] Given the `styles/index.css` hub file, When read, Then it contains only `@import` statements and an optional header comment

### Task Breakdown

1. **Create `styles/` directory structure** — S — Deps: none
2. **Extract `base.css`** (lines 1-219) — S — Deps: 1
3. **Extract `components.css`** (shared component styles) — L — Deps: 1
4. **Extract `pages/alerts.css`** — M — Deps: 1
5. **Extract `pages/home.css`** (gather scattered blocks) — M — Deps: 1
6. **Extract `pages/routes.css`** (gather scattered blocks) — M — Deps: 1
7. **Extract `pages/commute.css`** (gather scattered blocks) — M — Deps: 1
8. **Extract `pages/settings.css`** — S — Deps: 1
9. **Extract `pages/auth.css`** — S — Deps: 1
10. **Extract `pages/notification-history.css`** — S — Deps: 1
11. **Create hub `styles/index.css`** with `@import` statements — S — Deps: 2-10
12. **Update `main.tsx` import path** — S — Deps: 11
13. **Delete original `presentation/index.css`** — S — Deps: 12
14. **Visual regression test** (build + screenshot comparison) — M — Deps: 13

### Risk: MEDIUM-HIGH
- **CSS order matters:** `@import` order must preserve the original cascade. If styles relied on appearing after other styles for specificity, splitting can break things.
- **Mitigation:** Maintain `@import` order matching original file order. Base first, then components, then pages.
- **Scattered sections:** Gathering non-contiguous blocks requires careful identification of every rule.
- **Mitigation:** Use class name prefixes to assign rules to the correct file. Run full build + visual test after each extraction.

---

## Dependency Order & Execution Plan

```
Phase 1 (parallel, no dependencies):
  ├── I-6: useUserLocation hook + integration
  ├── N-5: eslint-disable resolution
  ├── N-14: Route save toast
  └── N-12: Settings deduplication

Phase 2 (after Phase 1 verified):
  └── I-2: CSS modularization (biggest risk, pure refactor)
```

**Rationale:** I-2 is the riskiest item (file reorganization affecting every page). It should be done last when all other changes are stable. If I-2 introduces a visual regression, it's easier to debug when no other functionality has changed.

Phase 1 items are fully independent of each other and can be worked on in any order.

---

## Estimated Cycle Effort

| Item | Effort | Tasks |
|------|:------:|:-----:|
| I-6: Hardcoded coords | M | 4 |
| N-5: eslint-disable | S | 5 |
| N-14: Route save toast | S | 3 |
| N-12: Settings dedup | M | 6 |
| I-2: CSS modularization | L | 14 |
| **Total** | **~XL** | **32** |

This is an ambitious cycle. If time is constrained, I-2 can be deferred to Cycle 6 and the remaining 4 items (I-6, N-5, N-14, N-12) form a comfortable M-sized cycle.

---

## Open Questions

1. **I-6:** Should the app show a one-time location permission explanation modal before calling `getCurrentPosition()`? Or just call it directly and handle denial gracefully?
2. **I-2:** Should `components.css` be further split if it exceeds 3,000 lines? The shared component styles alone may be ~2,600 lines.
3. **N-12:** Should the settings routes/alerts tabs still show a 1-2 line preview (e.g., "출근: 집 → 강남역 → 회사") or just the count?

---

## Out of Scope

- **Tailwind CSS migration** — separate future effort (N-6)
- **CSS Modules** — would require renaming all className references
- **Backend coordinate changes** — backend already accepts dynamic params
- **User location DB persistence** — would require migration + API endpoint changes
- **Jest to Vitest migration** — separate effort (N-1)
- **Settings page complete redesign** — only deduplicating, not redesigning

---

*Spec written: 2026-02-17 | Cycle 5 | PM Agent*
