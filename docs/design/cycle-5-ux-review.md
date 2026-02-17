# UX/UI Review: Cycle 5 Final Important + High-Value Nice-to-Have

> Reviewer: PD Agent (Senior Product Designer)
> Date: 2026-02-17
> Scope: N-14 (Route Save Toast), N-12 (Settings Deduplication), I-6 (Geolocation), I-2 (CSS Split)
> Frameworks Applied: Nielsen's 10 Heuristics, Gestalt Principles, Cognitive Load Theory, Fitts's Law, WCAG 2.1 AA

---

## Verdict: APPROVE (0 P0, 2 P1, 3 P2, 3 P3)

No blocking issues. Two P1 items worth addressing in the next cycle. Overall strong execution.

---

## 5-Second Test

### N-14: Route Save Toast
- **First impression:** The route creation flow now has a clear completion signal. Before, the user was silently navigated away. Now a green success toast anchors the experience's ending moment.
- **Clarity:** The toast messages are in plain Korean ("경로가 저장되었습니다"), immediately understandable.
- **CTA visibility:** The ConfirmStep's save button remains the primary action. The toast is a response, not competing for attention.

### N-12: Settings Shortcut Cards
- **First impression:** The settings page is visually simpler. Two tabs that previously showed mini-lists now show a single card with a count and a prominent CTA button.
- **Clarity:** "3개 등록된 경로" + "경로 관리 바로가기" communicates both state and next action.
- **CTA visibility:** The "바로가기" button is the only interactive element on the card. Zero decision overhead.

---

## What Works Well

### N-14: Route Save Toast

1. **Contextual message differentiation (H2: Match Real World)** -- Three distinct messages for three save scenarios: "경로가 수정되었습니다" (edit), "출근/퇴근 경로가 저장되었습니다" (dual-save), "경로가 저장되었습니다" (single create). The messages match the user's mental model of what just happened. This is strong H2 compliance.

2. **Progress indicator on toast (H1: Visibility of System Status)** -- The toast has a CSS `toastProgress` animation (4s linear, full-width to 0). This bottom bar gives the user a visual countdown showing how long until navigation occurs. It answers the implicit question "what happens next?" without requiring text.

3. **Non-blocking error path preserved (H9: Error Recovery)** -- On save failure, the existing `setError('저장에 실패했습니다. 다시 시도해주세요.')` remains intact. Toast is only shown on success. Error and success paths are cleanly separated.

4. **Dismissible toast (H3: User Control)** -- The close button on the toast (`aria-label="닫기"`) lets impatient users dismiss it manually. However, see P1 issue below about navigation behavior on dismiss.

5. **Toast accessibility (WCAG 4.1.3: Status Messages)** -- `role="alert"` and `aria-live="polite"` on each toast message. Screen readers will announce the success message without stealing focus.

### N-12: Settings Deduplication

6. **Reduced cognitive load (Hick's Law)** -- Before: the Routes tab showed a list of routes with delete buttons, start-tracking links, type badges, and checkpoint summaries. Users had to decide between managing routes in Settings vs. the dedicated Routes page. After: one card, one action. Decision time drops from log2(N) to log2(1).

7. **Gestalt Common Region** -- The `.settings-shortcut` card uses `background: var(--bg-card)` with `border: 1px solid var(--border)` and `border-radius: var(--radius-lg)`. The count and label are grouped in a `shortcut-info` column, visually distinct from the CTA button. Good use of containment to separate "what you have" from "what you can do."

8. **Empty state consistency (H4: Consistency)** -- Both RoutesTab and AlertsTab follow identical empty-state patterns: icon SVG + "없어요" text + primary button linking to the dedicated page. The parallel structure reduces learning cost.

9. **Props simplification reduces bug surface** -- `RoutesTab({ routeCount: number })` and `AlertsTab({ alertCount: number })` vs. the previous multi-prop interfaces with callbacks for delete, toggle, and formatting. Fewer props = fewer opportunities for state synchronization bugs between Settings and dedicated pages.

10. **ARIA tabpanel wiring preserved (WCAG 4.1.2)** -- Both tabs retain `role="tabpanel"`, `id="tabpanel-routes"/"tabpanel-alerts"`, and `aria-labelledby` pointing to their tab buttons. No accessibility regression.

### I-6: Geolocation Hook

11. **Progressive enhancement pattern (H7: Flexibility)** -- The hook starts with the best available data (cached localStorage), then upgrades to fresh geolocation in the background. Users outside Seoul get accurate weather immediately on return visits, while first-time users see Seoul data instantly with a silent upgrade happening.

12. **Zero-breakage fallback (H5: Error Prevention)** -- Geolocation denial, timeout, or unavailability all gracefully fall back to Seoul default. The user never sees an error for location -- the app simply works with the best available data.

13. **Clean isLoading guard in use-home-data.ts (H1: Visibility)** -- `if (!userId || userLocation.isLoading) return;` prevents weather API calls with stale coordinates. The weather card won't flash Seoul data and then re-render with Bundang data.

### I-2: CSS Split

14. **Zero visual regression by design** -- Pure file split, no class renames, no specificity changes. The `@import` order in `styles/index.css` preserves the original cascade. This is the safest possible approach to CSS modularization.

---

## Issues Found

| Priority | Heuristic/Principle | Location | Issue | Proposed Fix | Rationale |
|----------|-------------------|----------|-------|-------------|-----------|
| **P1** | H3: User Control | `RouteSetupPage.tsx:369` | Toast dismissal does not trigger navigation. If a user taps the close button on the toast, the `setTimeout` still runs for the full 1.5s. Worse, the toast auto-dismiss timer (4s) will fire after the user has already navigated away, which is harmless but wasteful. The spec says "When the user taps the close button, navigation happens immediately" but this is not implemented. | Clear the timeout on toast dismiss, or add a `useEffect` that navigates when `toast.toasts.length === 0` after a save success flag is set. | Users who dismiss the toast expect to be taken to the destination immediately. The 1.5s wait after manual dismiss feels unresponsive. |
| **P1** | H1: Visibility of System Status | `useUserLocation.ts` / Home page | The `isDefault` flag is set correctly in the hook, but no UI element on the home page uses it. The spec listed "서울 기준" badge on the weather card as a "Should" item. Without it, a user in Bundang who denied geolocation permission will see Seoul weather with no indication that it is not their local data. | Add a subtle badge or text below the weather section: "서울 기준" when `userLocation.isDefault === true`. Use `color: var(--ink-muted)` and `font-size: 0.75rem` so it is informational but not alarming. | This is a system status issue. The user deserves to know when the data is for a default location, not their actual one. Without this, users may make clothing/umbrella decisions based on weather for the wrong city. |
| **P2** | Fitts's Law / Mobile UX | `components.css:1521-1527` | On mobile, the toast container is positioned at `bottom: 16px`. The BottomNavigation bar is fixed at `bottom: 0` with ~56px height (8px padding + 44px content). This means the toast will overlap or sit very close to the bottom nav bar on mobile. On RouteSetupPage specifically this is not an issue (the page uses its own nav, not BottomNavigation), but if toast is ever reused on pages with BottomNavigation, overlap will occur. | Change mobile toast bottom position to `bottom: 72px` (56px nav height + 16px spacing) on pages with bottom nav, or use a CSS variable `--bottom-nav-offset` to coordinate. For RouteSetupPage specifically, current positioning is acceptable. | Per Fitts's Law, overlapping interactive elements (toast close button vs. nav items) creates targeting errors on touch devices. |
| **P2** | Gestalt: Similarity | `settings/RoutesTab.tsx:30` | The "경로 관리 바로가기" button uses `className="btn btn-primary"` -- the same treatment as the empty state's "경로 추가하기" button. However, these serve different purposes: one navigates to a management page, the other starts a creation flow. Using identical styling suggests they do the same thing. | Use `btn btn-outline` or `btn btn-secondary` for the shortcut "바로가기" link to distinguish navigation from creation. Reserve `btn-primary` for primary actions (create, save, submit). | Similarity principle: same visual treatment should mean same semantic action. Navigation links and creation CTAs should be visually differentiated. |
| **P2** | Peak-End Rule | `RouteSetupPage.tsx:369` | The 1.5s toast display before navigation is good, but the navigation target is `/` (home). For a user who just created a route, the most relevant next destination may be `/routes` (to see their route in the list and confirm it exists) or `/alerts` (to set up an alert for the route). Navigating to home is acceptable but not optimal for the "end" of the route creation journey. | Consider navigating to `/routes` instead of `/` so users see their new route in context. Or add a second CTA in the toast: "경로 보기" link. This is an enhancement, not a regression. | The Peak-End Rule says users judge experiences by the peak moment and the end. The route save is the peak (toast appears, satisfaction). The end should reinforce the accomplishment (seeing the route in a list), not drop them on a generic home page. |
| **P3** | H6: Recognition over Recall | `settings/RoutesTab.tsx:27-28` | The shortcut card shows count ("3개") and label ("등록된 경로") but no preview of what those routes are. A user must remember or navigate to see route names. | Add a one-line preview of the most recent or preferred route name below the count: e.g., "강남역 -> 판교역" in `color: var(--ink-muted)`. This gives recognition cues without requiring recall. | This was flagged as an open question in the spec (Q3). A single-line preview adds recognition value at minimal complexity cost. |
| **P3** | H6: Recognition over Recall | `settings/AlertsTab.tsx:27-28` | Same issue as RoutesTab -- count only, no preview content. | Show the next scheduled alert name and time: e.g., "출근 알림 - 매일 07:00" in muted text. | Symmetry with the RoutesTab recommendation. Users can recognize their alert setup at a glance. |
| **P3** | Microinteraction | `useUserLocation.ts` | No location permission pre-prompt or explanation. The browser's native geolocation prompt appears immediately on first visit. Some users may instinctively deny without understanding why the app needs their location. | Add a one-time explanation toast or inline message on the home page: "정확한 날씨 정보를 위해 위치 권한이 필요합니다." Show this before or alongside the first geolocation request. Store a `location-prompt-shown` flag in localStorage to show it only once. | This is a "Could" item from the spec. Browser-native prompts have high denial rates. A pre-prompt explaining the value proposition ("accurate weather for your area") increases acceptance. |

---

## Implementation Suggestions

### P1-1: Toast Dismiss Triggers Navigation

```typescript
// In RouteSetupPage.tsx, track save completion
const [saveComplete, setSaveComplete] = useState(false);
const navigationTimerRef = useRef<ReturnType<typeof setTimeout>>();

// In handleSave, after toast.success():
setSaveComplete(true);
navigationTimerRef.current = setTimeout(() => navigate('/'), 1500);

// Add effect: if save is complete and all toasts dismissed, navigate immediately
useEffect(() => {
  if (saveComplete && toast.toasts.length === 0) {
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    navigate('/');
  }
}, [saveComplete, toast.toasts.length, navigate]);
```

### P1-2: Location Default Indicator

In the home page weather section, add after the weather hero:
```tsx
{userLocation.isDefault && (
  <p className="location-default-badge" aria-label="기본 위치 사용 중">
    서울 기준
  </p>
)}
```

CSS:
```css
.location-default-badge {
  font-size: 0.75rem;
  color: var(--ink-muted);
  text-align: center;
  margin-top: -8px;
  margin-bottom: 8px;
}
```

### P2-2: Differentiate Shortcut Button Style

```tsx
// RoutesTab.tsx line 30 - change from:
<Link to="/routes" className="btn btn-primary">
// to:
<Link to="/routes" className="btn btn-outline">
```

Same change for AlertsTab.tsx line 30.

---

## Accessibility Notes

### Passing

- **Toast: `role="alert"` + `aria-live="polite"`** -- correct for success notifications that should not interrupt screen reader flow aggressively.
- **Toast close button: `aria-label="닫기"`** -- screen readers will announce the button purpose.
- **Settings tabs: Full ARIA tabpanel pattern preserved** -- `role="tabpanel"`, `id`, `aria-labelledby` all intact.
- **Empty state icons: `aria-hidden="true"`** -- decorative SVGs correctly hidden from assistive technology.
- **Keyboard accessibility: All interactive elements are `<button>` or `<Link>`** -- no `<div onClick>` patterns.

### Advisory

- **Toast auto-dismiss timing (4s):** The 4-second auto-dismiss may be too fast for users with motor disabilities who need extra time to locate and press the close button or read the message. WCAG 2.2.1 (Timing Adjustable) recommends at least 20 seconds for time-limited content. However, since the toast message is a simple confirmation (not critical information), and the user has already completed the action, the 4s timing is acceptable for this context. The progress bar animation provides advance warning of dismissal.
- **Toast color contrast:** The success icon uses `var(--success)` on `var(--success-light)` background. Verify contrast ratio meets 4.5:1. Green-on-light-green combinations sometimes fail WCAG AA.

---

## Flow Analysis

### Route Save Flow (N-14)

```
User completes route setup
  -> Presses "저장" button
    -> Button shows loading state (isSaving=true)
      -> API call succeeds
        -> Toast appears with contextual message
          -> 1.5s delay
            -> Navigate to /
```

**Assessed quality:** Good. The flow has clear feedback at each stage: button disabled during save, toast on success, timed navigation. The only gap is the P1 issue about toast dismiss not triggering immediate navigation.

**Error path:**
```
  -> API call fails
    -> setError('저장에 실패했습니다. 다시 시도해주세요.')
      -> User sees inline error, stays on page, can retry
```

**Assessed quality:** Good. Error is shown inline, user retains their form data, no data loss.

### Settings Navigation Flow (N-12)

```
User opens Settings
  -> Taps "경로" tab
    -> Sees "3개 등록된 경로" card
      -> Taps "경로 관리 바로가기"
        -> Navigates to /routes (full management UI)
```

**Assessed quality:** Excellent. Single clear path from settings to dedicated management. No confusing duplicate UI.

**Empty state:**
```
User opens Settings
  -> Taps "경로" tab
    -> Sees icon + "등록된 경로가 없어요"
      -> Taps "경로 추가하기"
        -> Navigates to /routes (creation UI)
```

**Assessed quality:** Good. Empty state provides clear guidance and a direct path to resolution.

### Geolocation Flow (I-6)

```
User opens home page
  -> useUserLocation checks localStorage cache
    -> Cache exists: Use cached coords immediately (isLoading=true)
    -> No cache: Use Seoul defaults (isLoading=true)
  -> Geolocation API called in background
    -> Success: Update coords + cache + isLoading=false
    -> Error: Keep current coords + isLoading=false
  -> use-home-data waits for isLoading=false
    -> Weather API called with resolved coordinates
```

**Assessed quality:** Good architecture. The two-phase approach (immediate cache/default, then background refresh) eliminates loading delays for returning users. First-time users see Seoul weather instantly while geolocation resolves.

**Missing:** No UI feedback about which location is active (P1 issue).

---

## Summary Table

| Item | UX Quality | Issues | Verdict |
|------|:----------:|:------:|---------|
| N-14: Route Save Toast | Strong | 1 P1 (dismiss behavior), 1 P2 (nav target) | APPROVE |
| N-12: Settings Dedup | Excellent | 1 P2 (button style), 2 P3 (preview content) | APPROVE |
| I-6: Geolocation | Good | 1 P1 (no default indicator), 1 P3 (no pre-prompt) | APPROVE |
| I-2: CSS Split | N/A (no visual change) | 0 issues | APPROVE |

**Overall Cycle 5 Verdict: APPROVE**

P1 items (toast dismiss navigation + location default indicator) are recommended for the next cycle but do not block this release.

---

*Review completed: 2026-02-17 | Cycle 5 | PD Agent*
