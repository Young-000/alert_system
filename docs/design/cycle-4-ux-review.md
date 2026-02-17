# UX/UI Review: Cycle 4 Quality Depth

> Reviewer: PD Agent (Senior Product Designer)
> Date: 2026-02-17
> Scope: I-3 (Error Feedback), I-7 (SettingsPage Split), Overall Consistency
> Frameworks Applied: Nielsen's 10 Heuristics, Gestalt Principles, WCAG 2.1 AA, Cognitive Load Theory

---

## 5-Second Test

### HomePage Error States (I-3)
- **First impression:** The weather hero section degrades cleanly -- if weather loads, it looks normal; if it fails, a muted paragraph replaces the section. This is non-disruptive.
- **Clarity:** Users can still understand the page purpose. Error messages are subordinate to primary content, which is correct.
- **CTA visibility:** The "출발하기" button remains prominent and unaffected by error states above it. Good separation of concerns.

### SettingsPage Split (I-7)
- **First impression:** Visually identical to the pre-split monolith. The tab navigation with icons and badges is immediately scannable.
- **Clarity:** The 4-tab structure (프로필 / 경로 / 알림 / 앱) communicates scope clearly.
- **CTA visibility:** Each tab has a clear primary action (logout, delete, toggle, etc.). No regression.

### CommuteDashboardPage Errors (I-3)
- **First impression:** Error messages in analytics/routes/behavior tabs are present and use a subdued style (`p.muted`). They do not disrupt the tab layout.
- **Clarity:** Users see brief Korean text explaining the failure. Acceptable for an inline degradation pattern.

---

## What Works Well

### I-3: Error Feedback Implementation

1. **HomePage weather fallback (H9: Error Recovery)** -- The ternary chain in `HomePage.tsx:45-58` is well-structured: weather data present -> show hero; weather error present -> show muted fallback; neither -> show nothing. This prevents stuck loading states.

2. **Air quality error inline display (Gestalt: Common Region)** -- `WeatherHeroSection.tsx:34-38` embeds the air quality error inside the same `weather-hero-details` div where the AQI badge normally appears. The error replaces the badge spatially, maintaining the user's mental model of "this is where air quality info lives." This is excellent use of the Common Region principle.

3. **Transit error handling (H1: Visibility of System Status)** -- `CommuteSection.tsx:71-85` uses a clear 4-state pattern: loading spinner -> error text -> arrival data -> "정보 없음". Each transit item independently shows its state. Users know exactly which transit line failed and which succeeded.

4. **Dashboard tab error props (H4: Consistency)** -- `AnalyticsTab.tsx:12-14`, `RoutesTab.tsx:113-114`, `BehaviorTab.tsx:19-21` all use the same pattern: `{error && <p className="muted" role="alert">...</p>}`. Consistent treatment across all three tab panels.

5. **StationSearchStep error wiring (H9: Error Recovery)** -- `RouteSetupPage.tsx:524` correctly uses `error={search.searchError || error}`, which gives search-specific errors priority over page-level errors. The `StationSearchStep` component already has a styled error display with a warning icon SVG (`route-validation-error` class + `role="alert"`).

6. **Clipboard fallback (H9: Error Recovery)** -- `use-settings.ts:252-255` catches clipboard failure and shows "복사에 실패했습니다." via the existing `actionError` banner. The error auto-dismisses after `TOAST_DURATION_MS`. This is a good pattern -- brief, non-blocking, self-clearing.

### I-7: SettingsPage Split

7. **Full ARIA tab implementation (WCAG 4.1.2)** -- The orchestrator and all 4 tab components maintain complete ARIA wiring: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`, and matching `id` attributes. This is production-quality accessibility for tab patterns.

8. **Prop surface area (Hick's Law)** -- Each tab component receives only the props it needs. `ProfileTab` has 4 props, `RoutesTab` has 2, `AlertsTab` has 4, `AppTab` has 9 (most complex, reflecting its content density). No prop drilling of the entire settings state.

9. **Cross-tab modals stay in orchestrator (H3: User Control)** -- The 3 `ConfirmModal` instances remain in `SettingsPage.tsx` because they can be triggered from multiple tabs. This prevents modal state from being lost during tab switches.

10. **Toast remains global (H1: System Status)** -- The reset success toast stays in the orchestrator, ensuring it persists even if the user switches tabs after an action.

---

## Issues Found

| Priority | Heuristic/Principle | Location | Current | Proposed Fix | Rationale |
|----------|-------------------|----------|---------|-------------|-----------|
| P2 | H4: Consistency | Dashboard tab errors | `<p className="muted" role="alert" style={{ margin: ... }}>` with varying margins: `'0 0 0.75rem'` (Analytics, Behavior) vs `'0.75rem 0'` (Routes) | Unify to `style={{ margin: '0 0 0.75rem' }}` across all three, or extract a shared `<TabError>` component | Three instances of the same pattern should have identical spacing to avoid visual inconsistency when users switch between tabs |
| P2 | H8: Minimalist Design | `WeatherHeroSection.tsx:36-37` | Air quality error shows raw `airQualityError` string inside a `<span className="muted">` | Consider showing a shorter label like "미세먼지 정보 없음" rather than passing an arbitrary error string, which could be unexpectedly long | The weather hero is a compact section. Long error text could break the horizontal layout of the `weather-hero-details` row |
| P2 | H9: Error Recovery | `HomePage.tsx:54-57` weather error fallback | Shows `<p className="muted">` with the error text but no action | Add a subtle "다시 시도" link or note like "새로고침하면 다시 불러옵니다" below the error text | Users see the error but have no guidance on recovery. Even a passive hint helps (Nielsen H9: "Error messages should precisely indicate the problem and constructively suggest a solution") |
| P2 | H9: Error Recovery | Dashboard tab errors (`AnalyticsTab`, `RoutesTab`, `BehaviorTab`) | `<p className="muted">` with error text only | Add a "다시 불러오기" button or hint text | Same rationale as above -- error without recovery path violates H9 |
| P3 | Gestalt: Similarity | Error styling variance | `notice error` class (red background, left border) used in `HomePage.tsx:33`, `CommuteDashboardPage.tsx:82`, `SettingsPage.tsx:63` for page-level errors; but `p.muted` (gray text) used for section-level errors in dashboard tabs and weather hero | Document the distinction: `notice error` = page-level blocking errors; `p.muted` with `role="alert"` = section-level degradation. Consider adding a shared `SectionError` component for the latter | Two visual treatments for errors could confuse users if they appear on the same page. The current hierarchy is actually correct (page-level = red, section-level = gray), but it should be intentional and documented |
| P3 | H7: Flexibility | SettingsPage tab badges | Tab badges show counts (`routes.length`, active alerts count) but disappear when count is 0 | This is correct behavior -- no badge when empty. No fix needed. Noting as a positive design decision. | N/A |
| P3 | Miller's Law | `AppTab.tsx` | 161 lines, contains Version + Local Data + Push + Notification History link + Privacy (Export + Delete) + Footer | Consider splitting Privacy into its own group with a visual separator, or moving the Footer text into the orchestrator | The App tab has 6+ distinct sections. On mobile, users need to scroll to discover Privacy options. A visual separator or section header between "Push" and "Privacy" would improve scannability |

---

## Detailed Analysis by Area

### I-3: Error Feedback -- Deep Dive

#### Weather Error Path (HomePage -> WeatherHeroSection)

The implementation follows a clean conditional rendering chain:

```
HomePage.tsx:45-58:
  weather exists     -> <WeatherHeroSection weather={...} airQualityError={...} />
  weatherError exists -> <section className="weather-hero"><p className="muted" role="alert">{weatherError}</p></section>
  neither            -> null (nothing rendered)
```

**UX Assessment:** This is the correct approach. When weather data is completely unavailable, users see a muted message inside a wrapper that maintains the section's vertical space. The `aria-label="날씨 오류"` on the fallback section provides screen reader context.

**Air quality error within WeatherHeroSection:**

```
WeatherHeroSection.tsx:34-38:
  airQuality.label !== '-' -> show AQI badge
  airQualityError exists   -> show muted error text
  neither                  -> null (no AQI info shown)
```

**UX Assessment:** Good partial degradation. Weather data loads successfully but air quality fails independently. Users still see temperature, humidity, condition -- they just lose the AQI badge. The error text replaces the badge in the same visual location (Gestalt: Common Region).

#### Transit Error Path (CommuteSection)

```
CommuteSection.tsx:71-85:
  info.isLoading -> spinner
  info.error     -> <span className="today-transit-time muted" role="alert">{info.error}</span>
  info.arrivals  -> arrival time display
  else           -> "정보 없음"
```

**UX Assessment:** Each transit item handles its own error independently. If subway fails but bus succeeds, the user sees "조회 실패" for subway and actual arrival times for bus. This is the correct granularity. The `muted` class ensures errors don't visually compete with successful data.

**Potential concern:** The error text "조회 실패" is set in the hook (`use-home-data.ts`), not in the component. This couples the error message to the data layer. For i18n or future message changes, consider moving display text to the presentation layer. However, for this cycle scope, this is acceptable.

#### Dashboard Tab Errors

All three dashboard tab components (Analytics, Routes, Behavior) now accept optional error props and render them at the top of the tab panel:

```tsx
// Pattern in all 3 tabs:
{error && <p className="muted" role="alert" style={{ margin: '...' }}>{error}</p>}
```

**UX Assessment:** The error appears above the tab content, which is the correct position -- users see the error first, then whatever partial data loaded below it. The `role="alert"` ensures screen readers announce the error. The `muted` class (gray, secondary text color) is appropriate for non-blocking degradation.

**One inconsistency:** `RoutesTab.tsx:114` uses `margin: '0.75rem 0'` while the other two use `margin: '0 0 0.75rem'`. This means the Routes tab error has top margin but the others don't. Visually minor, but should be unified for consistency.

#### Station Search Error (RouteSetupPage)

```tsx
// RouteSetupPage.tsx:524
error={search.searchError || error}
```

**UX Assessment:** The `searchError` from `useStationSearch` takes priority over the page-level `error`. This is correct because:
1. When the user is actively searching, a search-specific error ("검색에 실패했습니다") is more relevant than a stale page error.
2. The `StationSearchStep` component already renders errors with a warning icon and `role="alert"`, so the visual treatment is handled.
3. When the search succeeds but something else fails, the page-level `error` falls through.

#### Route Setup Page Silent Catches

- **Line 115-117 (alerts load):** Now uses `console.warn` + returns empty array. The outer catch on line 125-129 sets a user-visible error. This is a reasonable degradation: if only alerts fail to load, routes still display.
- **Line 125-129 (routes load):** Sets `setError('경로 목록을 불러올 수 없습니다')`. This error is displayed in the page via the `error` state. Correct.
- **Line 306-308 (auto-create alert after route save):** Sets `setWarning('경로는 저장되었지만 알림 생성에 실패했습니다')`. The warning is displayed in `AskMoreStep`. This is a good pattern -- the primary action (route save) succeeded, so we don't show an error, just a warning about the secondary action.

### I-7: SettingsPage Split -- Deep Dive

#### Structure Assessment

| Component | Lines | Responsibility | Props | Verdict |
|-----------|------:|----------------|------:|---------|
| `SettingsPage.tsx` (orchestrator) | 160 | Auth guard, tab bar, loading, error, modals, toast | 0 (uses hook) | Slightly over 120-line spec target but well-structured |
| `use-settings.ts` | 310 | All state, effects, handlers | N/A | Complex but well-typed return object |
| `ProfileTab.tsx` | 56 | User info display, logout | 4 | Clean, minimal |
| `RoutesTab.tsx` | 66 | Route list, delete trigger | 2 | Clean, minimal |
| `AlertsTab.tsx` | 78 | Alert list, toggle, delete | 4 | Clean, includes schedule formatting |
| `AppTab.tsx` | 161 | Version, local data, push, privacy, footer | 9 | Largest tab, could benefit from internal grouping |

**UX Continuity Check:** The split preserves all visual elements:
- Tab bar with icons and count badges -- preserved in orchestrator
- Loading spinner -- preserved in orchestrator
- Action error banner (`notice error`) -- preserved in orchestrator
- Delete confirmation modal -- preserved in orchestrator (cross-tab)
- Local data reset modal -- preserved in orchestrator
- Delete all data modal -- preserved in orchestrator
- Reset success toast -- preserved in orchestrator
- All section content within each tab -- preserved in respective tab components

**No visual regressions detected.** The user experience is identical before and after the split.

#### ARIA Compliance

The tab pattern follows WAI-ARIA Authoring Practices 1.1 Tab pattern:

1. `role="tablist"` on the container -- YES (`SettingsPage.tsx:29`)
2. `role="tab"` on each tab button -- YES (`SettingsPage.tsx:39`)
3. `aria-selected="true|false"` on tabs -- YES (`SettingsPage.tsx:41`)
4. `aria-controls` pointing to panel ID -- YES (`SettingsPage.tsx:42`)
5. `role="tabpanel"` on content panels -- YES (all 4 tab components)
6. `id` on panels matching `aria-controls` -- YES (e.g., `tabpanel-profile`)
7. `aria-labelledby` on panels pointing back to tab -- YES (e.g., `tab-profile`)

**Missing from strict WAI-ARIA Tab pattern:**
- No `tabindex="0"` / `tabindex="-1"` management for keyboard navigation (arrow keys between tabs). This is a pre-existing gap, not introduced by the split.
- No `aria-orientation` on the tablist. Optional per spec, horizontal is the default.

These are P3 enhancements, not regressions.

#### Orchestrator Line Count

At 160 lines, the orchestrator exceeds the 120-line spec target. The excess comes from:
- 3 `ConfirmModal` instances (lines 107-150 = ~43 lines)
- 1 toast (lines 153-157 = ~5 lines)
- Inline SVG icons in tab definitions (lines 31-34 = ~4 lines each x 4 tabs)

**UX Impact:** None. The code is readable and the component has a clear structure: auth guard -> tab bar -> loading -> error -> content -> modals -> toast. The 160-line count does not affect user experience.

**Recommendation:** Extract modals to `SettingsModals.tsx` to bring orchestrator under 120 lines. This is a developer experience improvement, not a UX issue. P3.

---

## Accessibility Notes

### Positive Findings

1. **`role="alert"` used consistently** -- All error messages that appear dynamically use `role="alert"`, which triggers screen reader announcements. This is correct for errors that appear without page navigation.

2. **`aria-live="assertive"` on SettingsPage error** -- The action error in `SettingsPage.tsx:63` uses both `role="alert"` and `aria-live="assertive"`. This is redundant (`role="alert"` implies `aria-live="assertive"`) but not harmful. Consistent with the existing codebase pattern.

3. **`aria-live="polite"` on loading states** -- Loading containers in both `CommuteDashboardPage.tsx:56` and `SettingsPage.tsx:55` use `aria-live="polite"`, which is correct for loading states (non-urgent updates).

4. **Icon buttons have `aria-label`** -- Copy button (`aria-label="ID 복사"`), delete buttons (`aria-label="삭제"`), back buttons (`aria-label="뒤로 가기"`) all have labels.

5. **Decorative SVGs have `aria-hidden="true"`** -- Consistently applied across all tab icons, section icons, and action icons.

### Concerns

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| `aria-live` double declaration | `SettingsPage.tsx:63` | None (redundant but harmless) | Remove `aria-live="assertive"` since `role="alert"` already implies it. P3. |
| No keyboard arrow navigation for tabs | `SettingsPage.tsx`, `DashboardTabs.tsx` | Users must Tab between tab buttons instead of using arrow keys | Add `onKeyDown` handler for Left/Right arrow key navigation per WAI-ARIA Tabs pattern. P3 (pre-existing). |
| Transit error inherits `muted` class color | `CommuteSection.tsx:74` | Gray text on white background meets WCAG AA (4.5:1 with `--ink-secondary` = #6b7280 on #fff = ~4.6:1) | Borderline pass. Monitor if theme colors change. |

---

## Error Message Language Audit

| Location | Message | Tone | Actionable? | Verdict |
|----------|---------|------|:-----------:|:-------:|
| Weather fallback | `weatherError` (from hook: "날씨 정보를 불러올 수 없습니다") | Neutral, factual | No | OK -- passive, non-alarming |
| Air quality fallback | `airQualityError` (from hook: "미세먼지 정보 없음") | Neutral, factual | No | OK -- brief label style |
| Transit error | "조회 실패" | Neutral, brief | No | OK -- fits the compact transit row |
| Analytics error | "분석 데이터를 불러올 수 없습니다" | Neutral, factual | No | OK |
| Comparison error | "비교 데이터 없음" | Neutral, brief | No | OK |
| Behavior error | "패턴 분석 실패" | Neutral, brief | No | OK |
| Search error | "검색에 실패했습니다" | Neutral, factual | No | OK |
| Clipboard error | "복사에 실패했습니다." | Neutral, factual | No | OK -- auto-dismisses |
| Route load error | "경로 목록을 불러올 수 없습니다" | Neutral, factual | No | OK |
| Alert auto-create warning | "경로는 저장되었지만 알림 생성에 실패했습니다" | Neutral, explanatory | No | Good -- explains partial success |

**Language Consistency Assessment:**
- All messages use polite Korean (합니다/입니다 form)
- No developer jargon (no HTTP codes, no "API", no "null")
- Consistent sentence-ending style: "~할 수 없습니다" for failures, "~실패" for brief labels
- No alarming language (no "오류!", no exclamation marks, no red text for section-level errors)

**One recommendation:** The brief labels ("조회 실패", "비교 데이터 없음", "패턴 분석 실패") and the full sentences ("분석 데이터를 불러올 수 없습니다") coexist. This is acceptable because brief labels appear in compact UI spaces (transit row, tab headers) while full sentences appear in dedicated error areas. The distinction maps to UI density, not inconsistency.

---

## Error-to-Resolution Path Assessment

| Error Scenario | User Sees | Recovery Path | Adequacy |
|----------------|-----------|---------------|:--------:|
| Weather API failure | "날씨 정보를 불러올 수 없습니다" in muted text | Pull-to-refresh or navigate away and back | Adequate -- weather is non-blocking |
| Air quality failure | "미세먼지 정보 없음" inline | Same as weather | Adequate -- AQI is informational |
| Transit lookup failure | "조회 실패" per transit item | Automatic retry on next data refresh (hook re-fetches) | Adequate -- transit info is time-sensitive anyway |
| Analytics/Comparison/Behavior failure | Error text at top of tab | Navigate away and back, or switch tabs and return | Adequate for MVP; retry button would improve |
| Station search failure | "검색에 실패했습니다" below search input | Type again (triggers new search) | Good -- natural retry path through user action |
| Clipboard failure | "복사에 실패했습니다." in banner | Try again (click copy button again) | Good -- action is repeatable |
| Route list load failure | "경로 목록을 불러올 수 없습니다" | Navigate away and back | Adequate -- matches pattern of other load failures |
| Alert auto-create after route save | "경로는 저장되었지만 알림 생성에 실패했습니다" | Navigate to alert settings to create manually | Good -- explains the partial success clearly |

**Overall:** No dead-end error states exist. Every error scenario has a natural (if implicit) recovery path. Explicit retry buttons would improve the experience but are correctly deferred to a future cycle per the spec's "Won't" section.

---

## UX Regression Check

| Area | Pre-Cycle 4 | Post-Cycle 4 | Regression? |
|------|-------------|--------------|:-----------:|
| Weather section (weather loads) | Shows hero with temp, condition, AQI | Identical | No |
| Weather section (weather fails) | Blank / stuck loading | Shows muted error message | Improvement |
| Transit info (loads) | Shows arrival times | Identical | No |
| Transit info (fails) | Shows "정보 없음" or stuck loading | Shows "조회 실패" | Improvement |
| Settings page (all tabs) | Single 678-line component | Split into orchestrator + 4 tabs | No visual change |
| Settings tab switching | Instant tab switch | Identical (no lazy loading) | No |
| Settings ARIA | Full ARIA tab attributes | Identical attributes in new structure | No |
| Dashboard analytics tab | Empty on error | Shows error message + partial data | Improvement |
| Route setup search | Empty results on error | Shows "검색에 실패했습니다" | Improvement |
| Clipboard copy | Silent failure | Shows "복사에 실패했습니다." banner | Improvement |

**No UX regressions detected.** All changes are either neutral (I-7 structural split) or positive (I-3 error feedback additions).

---

## Implementation Suggestions

### 1. Unify dashboard tab error margins (P2)

```tsx
// In AnalyticsTab.tsx, RoutesTab.tsx, BehaviorTab.tsx:
// Replace varying inline margins with a consistent approach:
{error && (
  <p className="muted" role="alert" style={{ margin: '0 0 0.75rem' }}>
    {error}
  </p>
)}
```

Or better, extract a shared component:

```tsx
// components/SectionError.tsx
interface SectionErrorProps {
  message: string;
}

export function SectionError({ message }: SectionErrorProps): JSX.Element {
  return (
    <p className="muted" role="alert" style={{ margin: '0 0 0.75rem' }}>
      {message}
    </p>
  );
}
```

### 2. Cap air quality error text length (P2)

```tsx
// WeatherHeroSection.tsx:36-37
// Ensure the error text is concise:
<span className="muted" role="alert">
  {airQualityError.length > 20 ? '미세먼지 정보 없음' : airQualityError}
</span>
```

Or enforce the message in the hook to always be a short label.

### 3. Future cycle: Add retry buttons to section errors (P3)

```tsx
// Example pattern for weather error:
<section className="weather-hero" aria-label="날씨 오류">
  <p className="muted" role="alert">{data.weatherError}</p>
  <button type="button" className="btn btn-ghost btn-sm" onClick={data.retryWeather}>
    다시 시도
  </button>
</section>
```

This requires adding retry callbacks to the hooks, which is out of scope for Cycle 4.

---

## Summary

| Item | P0 | P1 | P2 | P3 |
|------|:--:|:--:|:--:|:--:|
| I-3: Error Feedback | 0 | 0 | 3 | 1 |
| I-7: SettingsPage Split | 0 | 0 | 0 | 2 |
| Overall Consistency | 0 | 0 | 0 | 1 |
| **Total** | **0** | **0** | **3** | **4** |

---

## Verdict: APPROVE

No P0 or P1 issues. The 3 P2 issues (inconsistent tab error margins, potential long error text in compact space, missing recovery guidance) are minor polish items that do not block the cycle.

**I-3 (Error Feedback):** The error states are correctly wired from hooks through to UI components. Every previously silent catch block now produces visible feedback. Error messages use appropriate tone (neutral, non-alarming), appropriate styling (muted for section-level, notice.error for page-level), and appropriate ARIA attributes (`role="alert"`). The QA report's MAJOR-1/MAJOR-2 findings about unwired error states appear to have been addressed in a subsequent fix pass -- the current code in `HomePage.tsx`, `CommuteSection.tsx`, `CommuteDashboardPage.tsx`, and `RouteSetupPage.tsx` all properly consume and display the error states from their respective hooks.

**I-7 (SettingsPage Split):** Zero visual or behavioral regressions. Full ARIA compliance maintained. The split improves developer experience without any user-facing impact.

**Recommendations for Next Cycle:**
1. Extract a shared `SectionError` component to unify the inline error pattern
2. Add explicit retry buttons for section-level errors (weather, transit, analytics)
3. Add keyboard arrow navigation to tab patterns (WAI-ARIA Tabs best practice)

---

*Review performed: 2026-02-17*
*Frameworks: Nielsen H1/H3/H4/H7/H8/H9, Gestalt (Common Region, Similarity), WCAG 2.1 AA (4.1.2 Name/Role/Value), Cognitive Load (Miller's Law)*
