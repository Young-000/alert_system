# UX/UI Review: Cycle 7 - Home Page Cognitive Load Reduction (N-11)

> Reviewer: PD Agent (Senior Product Designer)
> Date: 2026-02-17
> Scope: Collapsible Weather Hero + Stats Section, `useCollapsible` hook
> Files reviewed:
> - `frontend/src/presentation/hooks/useCollapsible.ts`
> - `frontend/src/presentation/hooks/useCollapsible.test.ts`
> - `frontend/src/presentation/pages/home/WeatherHeroSection.tsx`
> - `frontend/src/presentation/pages/home/StatsSection.tsx`
> - `frontend/src/presentation/pages/home/HomePage.tsx`
> - `frontend/src/presentation/styles/pages/home.css` (collapsible sections)

---

## 5-Second Test

- **First impression:** The collapsed weather line ("22deg Sunny AQI badge") is compact and scannable. The chevron provides a visual cue for expand/collapse. The page feels significantly lighter compared to the previous 9-section layout.
- **Clarity:** Yes -- the collapsed summary communicates the three most important weather datapoints (temperature, condition, air quality) at a glance. The "이번 주" stats summary with average/count is similarly effective.
- **CTA visibility:** With both sections collapsed, the "출발하기" button inside CommuteSection should be visible within or near the first viewport on iPhone SE (667px). This is a major improvement.

**Verdict on first impression:** Positive. The information density reduction is immediately noticeable. The page communicates "weather is fine, here's your commute" without requiring the user to process 9 separate sections.

---

## What Works Well

### 1. Information Scent in Collapsed Summaries (Cognitive Load Theory)
The collapsed weather summary ("22deg | 맑음 | 미세먼지 좋음") provides exactly the right level of **information scent** (Larson & Czerwinski, 1998). Users can assess "do I need to dig deeper?" without expanding. This follows **Miller's Law** -- the summary presents 3 chunks (temperature, condition, AQI) instead of 7+ data points.

### 2. Consistent Collapsible Pattern (Nielsen H4: Consistency)
Both WeatherHeroSection and StatsSection use the same `useCollapsible` hook, producing identical interaction patterns (chevron indicator, click/tap to toggle, Enter/Space keyboard, aria-expanded). Users learn the pattern once and apply it everywhere. The shared `.collapsible-content` and `.collapsible-chevron` CSS classes reinforce this visual consistency.

### 3. State Persistence (Nielsen H7: Flexibility & Efficiency)
Saving collapse state to `localStorage` respects returning users' preferences. A power user who always wants weather details expanded will get that on every visit. The `home_collapsible_` namespace avoids key collisions.

### 4. Progressive Disclosure Done Right (Hick's Law)
The collapsed-by-default approach for both weather and stats reduces initial decision count from ~9 sections to ~5 visible sections. This directly addresses the Hick's Law violation flagged in Cycle 1.

### 5. Accessibility Foundation (WCAG 2.1 AA)
- `aria-expanded` dynamically reflects state (AC-4 satisfied)
- `aria-label` on toggle provides clear state description ("날씨 상세 펼치기" / "날씨 상세 접기")
- Keyboard support: Enter and Space both toggle (WCAG 2.1.1 Keyboard)
- `tabIndex={0}` makes the toggle focusable
- `focus-visible` outline style with 2px solid primary color and 2px offset
- `prefers-reduced-motion: reduce` disables all transitions (WCAG 2.3.3)
- Chevron has `aria-hidden="true"` (decorative, not announced)

### 6. Route Chips Always Visible (Gestalt: Proximity)
The decision to keep "다른 경로" chips **outside** the collapsible stats section is architecturally correct. Route chips are navigation elements, not statistics -- hiding them behind a stats toggle would violate the Gestalt principle of proximity (grouping by function).

### 7. Smooth Transitions (Microinteraction Quality)
- `max-height 0.3s ease` + `opacity 0.2s ease` provides a smooth, non-jarring expand/collapse
- Chevron rotation at `0.2s ease` gives immediate visual feedback
- Hover state (`rgba(0,0,0,0.04)` background) on summary rows signals interactivity

---

## Issues Found

| Priority | Heuristic/Principle | Location | Current | Proposed Fix | Rationale |
|----------|-------------------|----------|---------|-------------|-----------|
| P1 | WCAG 2.1: Name, Role, Value (4.1.2) | WeatherHeroSection summary `<div>` | `<div>` with `role="button"` is used as the toggle control | Add `aria-controls="weather-detail-content"` pointing to the `id` on the `.collapsible-content` wrapper. Also add matching `id` to the controlled region. | Screen readers need to announce which region is being toggled. `aria-expanded` alone tells state but not *what* it controls. ARIA Authoring Practices for Disclosure pattern requires `aria-controls`. |
| P1 | WCAG 2.1: Name, Role, Value (4.1.2) | StatsSection summary `<div>` | Same as above | Add `aria-controls="stats-detail-content"` and matching `id` on `.collapsible-content` wrapper. | Same rationale as above. |
| P1 | Cognitive Load: Redundant Information | WeatherHeroSection expanded state | When expanded, the summary row still shows the 24px weather icon and "날씨 상세 접기" label, then the detail area duplicates temperature + condition in large format (`weather-temp-value` 2.5rem + `weather-condition`) | CSS currently hides `.weather-hero-summary-temp`, `.weather-hero-summary-condition`, etc. via `display: none` when expanded. However, the 48px `WeatherIcon` in the summary row and the expanded detail's `.weather-hero-main` section **both** render a weather icon. The summary row should show only the chevron (or minimal label) when expanded. | Users see the weather icon twice (48px in summary + detail). This is redundant and adds visual noise instead of reducing it. |
| P2 | Fitts's Law: Touch Target Size | WeatherHeroSection summary row | `min-height: 44px` on `.weather-hero-summary` is correct. However, padding is only `4px` with `-4px` margin compensation. Actual tap area may be larger than visual, but the *visual* affordance is compact. | Consider `padding: 8px` for the summary row so the visual touch target matches the actual hitbox. The negative margin trick can confuse developers maintaining this code. | While the min-height satisfies 44px, Fitts's Law says the *perceived* size matters. Users may hesitate to tap a visually small area even if the actual hitbox is large. |
| P2 | Fitts's Law: Touch Target Size | StatsSection summary row | Same `4px` padding / `-4px` margin pattern as weather. | Same fix: increase padding to `8px` and adjust margin accordingly, or simply remove the negative margin trick. | Same rationale. |
| P2 | Gestalt: Figure-Ground | WeatherHeroSection collapsed state | Collapsed weather has the same gradient background (`linear-gradient 135deg, #e0f2fe...`) as the expanded state but with reduced padding. The visual weight is similar. | When collapsed, consider reducing visual prominence: either flatten the background to `var(--bg-card)` with a subtle left border accent, or reduce gradient opacity. The goal is to make the collapsed state feel "summary-like" rather than "full card with less content." | The collapsed card should visually recede so the CommuteSection (the primary action card) becomes the dominant figure element per Gestalt Figure-Ground. Currently both cards have similar visual weight. |
| P2 | Nielsen H1: Visibility of System Status | Expand/collapse animation | `max-height: 600px` is a generous ceiling, but the `0.3s` transition calculates speed from 0 to 600px regardless of actual content height. If the weather detail content is only ~200px, the animation still "eases" across a 600px range, making it feel slow for small content and fast for large content. | Consider using CSS `grid-template-rows: 0fr / 1fr` transition pattern instead of `max-height`, which animates based on actual content height. Or set a tighter `max-height` per section (e.g., `300px` for weather, `250px` for stats). | The `max-height` hack is an industry-standard workaround, but it produces inconsistent animation speed. The `grid-template-rows` approach (supported in all modern browsers) gives uniform speed. |
| P2 | Nielsen H6: Recognition > Recall | Checklist items visibility | Checklist items (e.g., "우산", "마스크") are hidden inside the weather collapsible. When collapsed, users cannot see if they have unchecked preparation items. | Show a small badge or indicator on the collapsed weather summary when there are unchecked checklist items, e.g., "준비물 2" or a small dot indicator. This gives users a reason to expand without requiring recall. | Users must remember they have preparation items to check. A visual cue in the collapsed state would prompt them. |
| P2 | Gestalt: Continuity | Checklist `.collapsible-content` wrapper | The checklist is wrapped in its own `.collapsible-content` div *outside* the `<section>` element of weather-hero. This means the checklist and the weather detail share the same expand/collapse state but are structurally siblings, not parent-child. | This works functionally but is semantically fragile. Consider moving the checklist inside the `.weather-hero-detail` div so the entire "expandable weather content" is in one DOM subtree. This would also simplify the `aria-controls` fix above to point to a single container. | Structural clarity. Two separate `.collapsible-content` wrappers controlled by the same toggle is unusual and could confuse future developers or assistive technology. |
| P3 | Peak-End Rule | First-time user experience | Both sections default to collapsed. A first-time user lands on a page with minimal weather info and no stats. They may not discover that these sections are expandable. | For first-time visitors (no `localStorage` key exists), consider defaulting weather to expanded and stats to collapsed. This shows the full weather card on first use, teaching users what the collapsed version contains. After they manually collapse it, persist that preference. | New users need to understand what information is available before they can decide to hide it. Showing everything once establishes the mental model. |
| P3 | Visual Design: Chevron Discoverability | Both sections | The chevron icon is 16x16px, colored `var(--ink-muted)`. On mobile, this small gray icon may not be immediately recognized as a toggle affordance, especially for less tech-savvy users. | Increase chevron size to 20x20px and use `var(--ink-secondary)` for slightly more contrast. Alternatively, add a subtle text label like "더보기" next to the chevron when collapsed. | Discoverability is the primary risk of collapsible sections. The chevron alone is a learned pattern, not a universal one. A text hint reduces the learning curve. |
| P3 | Code Quality: DRY | `ChevronIcon` component | `ChevronIcon` is defined identically in both `WeatherHeroSection.tsx` and `StatsSection.tsx`. | Extract to a shared component, e.g., `frontend/src/presentation/components/ChevronIcon.tsx`. | Code duplication. Not a UX issue directly, but affects maintainability. |

---

## Detailed Analysis by Framework

### Cognitive Load Theory Assessment

**Before (Cycle 1 finding):** 9 sections, ~810px total height, Miller's Law violation (7+/-2 chunks exceeded).

**After (this implementation):**
- Collapsed state: ~5 visible sections (header 60px + weather summary 44px + commute card ~250px + alert bar ~50px + stats summary 44px = ~448px)
- This fits within iPhone SE viewport (667px) with ~220px margin
- "출발하기" button is at approximately position ~400px from top (inside commute card), well within the viewport

**Cognitive chunk count:**
1. Greeting (who am I)
2. Weather summary (one chunk: temp + condition + AQI)
3. Commute card with CTA (primary action)
4. Alert bar (next scheduled alert)
5. Stats summary (one chunk: average + count)

This is exactly 5 chunks -- within Miller's 7+/-2 guideline. Excellent improvement.

### Fitts's Law Assessment

| Element | Min Height | Width | Distance from Screen Center | Verdict |
|---------|-----------|-------|----------------------------|---------|
| Weather summary (toggle) | 44px | Full card width (~308px on 375px screen) | ~100px from top | PASS -- large target, close to thumb zone |
| "출발하기" button | ~52px (16px padding x 2 + font) | Full card width | ~350px from top | PASS -- within thumb reach on mobile |
| Stats summary (toggle) | 44px | Full card width | ~450px from top | PASS -- reachable without stretching |
| Chevron icon (visual) | 16px | 16px | Right edge of row | CONCERN -- small visual target, though parent row is the actual hitbox |
| Route chips | 44px min-height | Variable, ~120px+ | Below stats section | PASS |

### WCAG 2.1 AA Compliance

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.3.1 Info and Relationships | PASS | Semantic sections with aria-label |
| 2.1.1 Keyboard | PASS | Enter/Space toggle, Tab navigation |
| 2.4.3 Focus Order | PASS | Summary row is focusable via tabIndex=0 |
| 2.4.7 Focus Visible | PASS | `focus-visible` outline defined |
| 2.3.3 Animation from Interactions | PASS | `prefers-reduced-motion` disables transitions |
| 4.1.2 Name, Role, Value | PARTIAL | `aria-expanded` present, but `aria-controls` is missing (P1 issue) |

### Gestalt Principles Assessment

| Principle | Application | Verdict |
|-----------|-------------|---------|
| Proximity | Related items grouped (weather info together, stats together) | PASS |
| Proximity | Route chips correctly separated from stats | PASS |
| Similarity | Both collapsible sections share identical toggle pattern | PASS |
| Figure-Ground | Collapsed weather gradient competes with commute card for visual dominance | NEEDS IMPROVEMENT (P2) |
| Common Region | Each section has card border/background | PASS |
| Continuity | Chevron rotation provides directional continuity cue | PASS |

---

## Implementation Suggestions

### P1 Fix: aria-controls (WeatherHeroSection)

```tsx
// WeatherHeroSection.tsx - summary div
<div
  className="weather-hero-summary"
  {...ariaProps}
  aria-label={summaryLabel}
  aria-controls="weather-hero-detail"
>

// Detail wrapper - add id
<div
  id="weather-hero-detail"
  className={`collapsible-content ${isExpanded ? 'collapsible-content--expanded' : ''}`}
>
```

### P1 Fix: aria-controls (StatsSection)

```tsx
// StatsSection.tsx - summary div
<div
  className="home-stats-summary-row"
  {...ariaProps}
  aria-label={summaryLabel}
  aria-controls="stats-detail-content"
>

// Detail wrapper - add id
<div
  id="stats-detail-content"
  className={`collapsible-content ${isExpanded ? 'collapsible-content--expanded' : ''}`}
>
```

### P2 Fix: Collapsed Weather Visual Weight

```css
/* home.css - reduce collapsed weather prominence */
.weather-hero--collapsed {
  padding: 12px 16px;
  background: var(--bg-card);         /* flatten gradient */
  border-left: 3px solid #7dd3fc;     /* subtle accent to maintain weather identity */
  border-radius: var(--radius-lg);
}
```

### P3 Fix: First-Visit Default

```typescript
// useCollapsible.ts - add first-visit awareness
function readFromStorage(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(`home_collapsible_${key}`);
    if (stored === null) return fallback; // No change needed in hook
    return stored === 'true';
  } catch {
    return fallback;
  }
}

// WeatherHeroSection.tsx - change default for first visit
const { isExpanded, ariaProps } = useCollapsible({
  storageKey: 'weather',
  defaultExpanded: true,  // Show full weather on first visit
});
```

### P3 Fix: Extract Shared ChevronIcon

```tsx
// frontend/src/presentation/components/ChevronIcon.tsx
interface ChevronIconProps {
  expanded: boolean;
  size?: number;
}

export function ChevronIcon({ expanded, size = 16 }: ChevronIconProps): JSX.Element {
  return (
    <svg
      className={`collapsible-chevron ${expanded ? 'collapsible-chevron--expanded' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
```

---

## Accessibility Notes

1. **aria-controls missing (P1):** The ARIA Authoring Practices Guide for the Disclosure pattern (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) specifies that the button controlling a collapsible region should have `aria-controls` referencing the `id` of the controlled content. Both collapsible sections currently lack this.

2. **Checklist announced correctly:** Checklist buttons use `aria-pressed` which correctly communicates toggle state to screen readers. No issue.

3. **Section landmarks:** Both sections use `<section>` with `aria-label`, which is correct. Screen reader users can navigate by landmarks.

4. **Color-only information:** The AQI badge in the collapsed summary uses color classes (`aqi-good`, `aqi-moderate`, etc.) but also includes text labels ("좋음", "보통"), so color is not the sole information channel. PASS.

5. **Animation safety:** `prefers-reduced-motion: reduce` properly disables all collapsible transitions including chevron rotation and hover state transitions. PASS.

---

## useCollapsible Hook Quality Assessment

The hook is well-designed:

- **API surface is minimal and correct:** `isExpanded`, `toggle()`, and `ariaProps` cover all use cases.
- **localStorage error handling:** Both read and write are wrapped in try-catch. Graceful degradation in private browsing or quota-exceeded scenarios.
- **Lazy initialization:** `useState(() => readFromStorage(...))` avoids reading localStorage on every render.
- **Stable references:** `toggle` and `handleKeyDown` are memoized with `useCallback`. The `ariaProps` object is recreated on each render (not memoized), but this is acceptable since it's a lightweight object and memoizing it would require comparing all nested function references.
- **Test coverage:** 13 test cases covering default state, toggle, persistence, keyboard events, and error scenarios. Comprehensive.

**One suggestion (non-blocking):** Consider adding a `collapse()` and `expand()` method in addition to `toggle()`, for programmatic control scenarios (e.g., "collapse all sections" action).

---

## Viewport Height Calculation (AC-3 Verification)

Estimated layout height in collapsed state on iPhone SE (375x667px):

| Section | Height (estimated) |
|---------|-------------------|
| Status bar + safe area | ~44px |
| Home header (greeting + name) | ~60px |
| Weather summary (collapsed) | ~44px + 16px padding + 16px margin = ~76px |
| DeparturePrediction (conditional) | ~50px |
| RouteRecommendation (conditional) | ~50px |
| CommuteSection (route info + transit + button) | ~250px |
| **Subtotal to bottom of "출발하기"** | **~480-530px** |

With 667px viewport, the "출발하기" button should be visible with ~140-190px to spare. Even with DeparturePrediction and RouteRecommendation both showing (worst case), the button remains within the viewport. **AC-3 is likely met.**

Below the fold (scrollable):
| AlertSection | ~50px |
| Stats summary (collapsed) | ~44px + margin |
| Route chips | ~44px |

This is a good layout hierarchy -- the most important action is above the fold, and supplementary information is below.

---

## Summary

| Category | Count |
|----------|-------|
| P0 (Catastrophe) | 0 |
| P1 (Major) | 2 |
| P2 (Minor) | 5 |
| P3 (Enhancement) | 3 |

### Verdict: NEEDS CHANGES (2 P1 issues)

The implementation is fundamentally sound and achieves the core goal of reducing cognitive load from 9 sections to 5 visible chunks. The collapsible pattern is consistent, accessible (keyboard + screen reader), and respects user preferences via localStorage persistence. Transitions are smooth and motion-safe.

**Two P1 issues require fixing before merge:**

1. **`aria-controls` missing on both collapsible toggles.** This is a WCAG 4.1.2 violation for the Disclosure pattern. Fix is straightforward: add `id` to content regions and `aria-controls` to trigger elements.

2. Both P1 issues are the same fix pattern, applied to two components. Estimated effort: 10 minutes.

**P2 issues are recommended but non-blocking:**
- Visual weight of collapsed weather card (Gestalt Figure-Ground)
- Touch target visual sizing (Fitts's Law perception)
- max-height animation inconsistency
- Checklist indicator in collapsed state
- Checklist DOM structure

**P3 issues are backlog items** for future cycles.

---

*Review by: PD Agent | Frameworks applied: Nielsen's 10 Heuristics, Gestalt Principles, WCAG 2.1 AA, Cognitive Load Theory (Miller's Law, Hick's Law), Fitts's Law, ARIA Authoring Practices Guide*
