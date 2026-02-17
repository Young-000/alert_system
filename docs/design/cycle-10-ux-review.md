# UX/UI Review: Cycle 10 - Notification Monitoring Dashboard

> Reviewer: PD Agent (Senior Product Designer)
> Date: 2026-02-17
> Component: `NotificationStats` + `NotificationHistoryPage` integration
> Spec: cycle-10-monitoring.md

---

## 5-Second Test

- **First impression:** The stats card reads as a compact, scannable summary. The three-column layout (total / success rate / failures) follows the natural left-to-right reading order from general to specific. The colored status bar at the bottom provides a visual anchor.
- **Clarity:** Yes -- the labels ("전체", "성공률", "실패") immediately communicate what each metric represents. No jargon or developer terminology.
- **CTA visibility:** N/A -- this is a read-only informational component, not an action-oriented one. The primary actions (filters, history list) remain correctly positioned below.

---

## What Works Well

| Aspect | Detail | Principle |
|--------|--------|-----------|
| **Information hierarchy** | Stats card sits above filters and list, giving the user a summary-first experience before diving into details. Follows the inverted pyramid pattern. | Nielsen H1: Visibility of system status |
| **Progressive disclosure** | Stats appear only when data exists (total > 0). Empty state falls through to the existing empty page pattern. No redundant "no data" messages. | Hick's Law: Reduce decisions |
| **Parallel loading** | `Promise.allSettled` fetches stats alongside history. Non-blocking failure handling means the page degrades gracefully if stats fail. | Nielsen H1: System status + H9: Error recovery |
| **Visual semantics** | Green/yellow/red color coding for success rate aligns with universal traffic-light conventions. Users intuitively understand the severity. | Nielsen H2: Match real world |
| **Skeleton loading** | The skeleton matches the layout of the loaded state (3-column row + bar), preventing layout shift. Uses existing `.skeleton` CSS class system. | Nielsen H1: System status |
| **Consistent card styling** | `.notif-stats-card` uses the same `var(--bg-card)`, `border-radius: 12px`, and `box-shadow` as `.notif-history-item`. Visual language is unified. | Nielsen H4: Consistency |
| **CSS variable usage** | All colors reference existing design tokens (`--success`, `--warning`, `--error`, `--ink-primary`, `--ink-muted`). No hardcoded hex values. | Maintainability + consistency |
| **Transition on bar segments** | `transition: width 0.3s ease` on bar segments provides smooth visual feedback when period filter changes. | Microinteraction quality |
| **Title attributes on bar** | Each segment has `title` text ("성공: 10건", "대체 발송: 2건", "실패: 1건") giving hover tooltips on desktop. | Nielsen H6: Recognition rather than recall |

---

## Issues Found

| Priority | Heuristic/Principle | Location | Current | Proposed Fix | Rationale |
|----------|-------------------|----------|---------|-------------|-----------|
| **P1** | WCAG 1.4.1: Use of Color | Status bar (`.notif-stats-bar`) | Color-coded bar uses green/yellow/red as the *only* way to distinguish success/fallback/failed segments. No text labels, patterns, or icons within the bar itself. | Add a visually hidden text summary below the bar: `<span class="sr-only">성공 10건 (77%), 대체 발송 2건 (15%), 실패 1건 (8%)</span>`. Alternatively, add a small legend row below the bar with colored dots + labels. | Color-blind users (protanopia, deuteranopia) cannot distinguish red from green in the bar. The `title` attribute helps on hover but is invisible on mobile/touch and to screen readers. A text alternative or legend is needed for WCAG AA compliance. |
| **P1** | Nielsen H1: Visibility of system status | Stats card (`.notif-stats-card`) | No `role` or `aria` region marking. Screen reader users encounter the stats as disconnected `<div>` and `<span>` elements without context. | Wrap the stats card in `<section aria-label="알림 발송 통계">` or add `role="region" aria-label="알림 발송 통계"` to the outer div. For each stat item, use `aria-label` on the parent: e.g., `<div class="notif-stats-item" aria-label="전체 13건">`. | Assistive technology needs semantic grouping to announce "you are in the notification stats section" rather than reading disconnected spans. |
| **P1** | Nielsen H4: Consistency | Skeleton state | Skeleton uses inline `style={{ width: '40px' }}` and `style={{ width: '60px' }}` for sizing. The rest of the codebase uses CSS classes for skeleton dimensions (`.skeleton-text`, `.skeleton-title`, etc.). | Replace inline styles with CSS classes: `.notif-stats-skeleton-label { width: 40px; }` and `.notif-stats-skeleton-value { width: 60px; }` in the CSS file. For the bar skeleton, use a dedicated class `.notif-stats-skeleton-bar`. | Inline styles break the project's styling convention and make the skeleton dimensions harder to maintain. The CLAUDE.md explicitly states "인라인 스타일 금지 -- style={{ }} 사용 금지 (동적 값 제외)". The skeleton widths are static, not dynamic. |
| **P2** | Gestalt: Proximity + Common Region | Stats card | The "fallback" (대체 발송) count is only visible in the bar's `title` tooltip. It is not shown as a separate numeric stat in the stats row. Users who care about degraded delivery have no direct number to see. | Add a fourth stat item for "대체" between "성공률" and "실패", or add a small legend below the bar: `<div class="notif-stats-legend">` with `<span>성공 10</span> <span>대체 2</span> <span>실패 1</span>`. | The spec says "Fallback count shown separately from success" as a Should-have. Currently the component displays 3 metrics (total, success rate, failed) but the fallback count is buried in the bar tooltip. Adding a visible fallback count or legend would fulfill the spec and give users the full picture at a glance. |
| **P2** | Fitts's Law | Stats card | Stats card is purely read-only with no interactive affordance. When the period filter changes below, the stats update -- but users might not realize the stats and filter are connected because they are in separate visual containers. | Add a subtle visual connection: either (a) put a small period label inside the stats card header (e.g., "최근 7일 통계"), or (b) animate the stats card briefly on filter change (subtle `fadeIn` or highlight pulse) so the user notices the data has changed. | When a user clicks "최근 7일" in the filter section below, the stats card above silently updates. Without visual feedback connecting the action to the effect, users might not notice the stats changed (Peak-End Rule: make the response moment clear). |
| **P2** | Cognitive Load | Stats card | The success rate percentage is displayed as a raw number ("76.9%") without context for what constitutes a "good" or "bad" rate. While the color helps, a short qualifier would reduce cognitive load. | Consider adding a micro-label or tooltip next to the rate: green = "양호", yellow = "주의", red = "위험". Example: `<span class="notif-stats-rate-qualifier">주의</span>` below the percentage. | Users without domain knowledge must interpret the number + color together. A one-word qualifier reinforces the color signal and is especially helpful for color-blind users (serves as a text alternative to the color coding). |
| **P2** | High Contrast / Forced Colors | Stats bar + rate colors | The base CSS has `@media (forced-colors: active)` rules for buttons, cards, and inputs, but the new `.notif-stats-bar` and color-coded rate text have no forced-colors override. | Add forced-colors rules: `.notif-stats-bar-segment { forced-color-adjust: none; }` or provide border patterns. For rate text, ensure it uses `currentColor` or `CanvasText` in forced-colors mode. | The existing codebase supports `forced-colors: active` for core components. The new stats component should follow the same pattern. |
| **P3** | Miller's Law | Stats card | The stats card shows exactly 3 items (total, rate, failed) which is well within the 7 +/- 2 limit. No issue. | No change needed. | Informational -- the current design respects cognitive load limits. |
| **P3** | Microinteraction | Stats card entry | The stats card appears instantly when data loads. Other cards in the app use `fadeInUp 0.4s ease` entrance animation (see `.feature-card`, `.empty-state`). | Add `animation: fadeInUp 0.4s ease` to `.notif-stats-card` to match the rest of the app's entrance pattern. | Subtle improvement for visual polish. Not blocking. |

---

## Implementation Suggestions

### P1 Fix: Accessible bar legend (color-blind support)

```tsx
// After the bar div, add a screen-reader-friendly summary
<div className="notif-stats-bar" aria-label="발송 상태 비율">
  {/* ...existing bar segments... */}
</div>

{/* Visible legend for color-blind users + SR text */}
<div className="notif-stats-legend" aria-hidden="true">
  {stats.success > 0 && (
    <span className="notif-stats-legend-item">
      <span className="notif-stats-legend-dot notif-stats-bar--success" />
      성공 {stats.success}
    </span>
  )}
  {stats.fallback > 0 && (
    <span className="notif-stats-legend-item">
      <span className="notif-stats-legend-dot notif-stats-bar--fallback" />
      대체 {stats.fallback}
    </span>
  )}
  {stats.failed > 0 && (
    <span className="notif-stats-legend-item">
      <span className="notif-stats-legend-dot notif-stats-bar--failed" />
      실패 {stats.failed}
    </span>
  )}
</div>

{/* Screen reader only: full text description */}
<span className="sr-only">
  발송 통계: 성공 {stats.success}건, 대체 발송 {stats.fallback}건, 실패 {stats.failed}건
</span>
```

```css
/* Legend styles */
.notif-stats-legend {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 0.7rem;
  color: var(--ink-muted);
}

.notif-stats-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.notif-stats-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

### P1 Fix: Semantic region for assistive technology

```tsx
// Change the outer div to a section
<section className="notif-stats-card" data-testid="notif-stats" aria-label="알림 발송 통계">
  {/* ...existing content... */}
</section>
```

### P1 Fix: Remove inline styles from skeleton

```css
/* Add to notification-history.css */
.notif-stats-skeleton-label {
  width: 40px;
  display: inline-block;
}

.notif-stats-skeleton-value {
  width: 60px;
  display: inline-block;
}

.notif-stats-skeleton-bar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
}
```

```tsx
// Replace inline styles in skeleton
<div className="notif-stats-card" data-testid="notif-stats-skeleton">
  <div className="notif-stats-row">
    <div className="notif-stats-item">
      <span className="skeleton skeleton-text notif-stats-skeleton-label" />
      <span className="skeleton skeleton-text notif-stats-skeleton-value" />
    </div>
    {/* repeat for other items */}
  </div>
  <div className="skeleton notif-stats-skeleton-bar" />
</div>
```

---

## Accessibility Notes

1. **WCAG 1.4.1 (Use of Color):** The status breakdown bar relies solely on color to convey information. While `title` attributes exist, they are inaccessible on touch devices and to screen readers. A visible legend or text-only alternative is needed. **Severity: P1.**

2. **WCAG 1.3.1 (Info and Relationships):** The stats card lacks semantic structure. It should be wrapped in a `<section>` with an `aria-label` so assistive technology can identify it as a distinct content region. The individual stat items could benefit from explicit `aria-label` attributes that combine label + value (e.g., "전체 13건"). **Severity: P1.**

3. **WCAG 4.1.2 (Name, Role, Value):** The bar segments are plain `<div>` elements with no role. They could use `role="img"` with an appropriate `aria-label`, or the entire bar could be described via a single `aria-label` on the parent. Currently `aria-label="발송 상태 비율"` exists on the parent, which is adequate if supplemented by the legend or SR text. **Severity: P2 (partially addressed).**

4. **Forced Colors Mode:** No `@media (forced-colors: active)` rules exist for the new component. The green/yellow/red text colors and bar segments would become invisible or uniform in Windows High Contrast mode. **Severity: P2.**

5. **Focus order:** The stats card is non-interactive (no buttons, links, or form elements), so focus order is not impacted. Tab navigation flows directly from the error banner (if present) to the filter buttons below. **No issue.**

6. **Reduced motion:** The bar segment `transition: width 0.3s ease` will be suppressed by the existing `@media (prefers-reduced-motion: reduce)` rule in `base.css` (which sets `transition-duration: 0.1ms`). **Properly handled.**

---

## Mobile Responsiveness Check

| Aspect | Status | Notes |
|--------|--------|-------|
| **Card width** | OK | `.notif-stats-card` uses `margin: 0 16px`, matching other page content margins. No horizontal overflow. |
| **Stats row** | OK | `display: flex; justify-content: space-between` with `flex: 1` on items distributes evenly. At 320px viewport, each item gets ~93px which is sufficient for label + value. |
| **Font sizes** | OK | Labels at `0.72rem` (~11.5px) are small but legible for secondary info. Values at `1.1rem` (~17.6px) are prominent. Both above minimum touch-readable sizes. |
| **Bar height** | OK | 8px is appropriate -- tall enough to see color segments, thin enough to not dominate. |
| **Touch targets** | N/A | No interactive elements in the stats card. |
| **Text truncation** | OK | "76.9%" and "13건" are short strings. No overflow risk. |

**Note:** On very narrow screens (< 320px), the three stat items might feel cramped. A `flex-wrap: wrap` fallback is not defined, but this viewport is extremely rare. No fix needed.

---

## User Flow Analysis

```
Entry: User navigates to /notifications
  |
  v
Page loads --> Stats skeleton + History spinner shown simultaneously (good)
  |
  v
Stats resolve --> Skeleton replaced by data card (no layout shift: same dimensions)
  |
  v
User sees: Total | Success Rate (colored) | Failures (red if > 0) | Status bar
  |
  v
User clicks period filter (7일/30일/전체)
  |
  v
Stats refetch --> Card updates (subtle: no explicit visual feedback linking action to result)  <-- P2 issue
  |
  v
User scrolls down to see individual notification entries
```

**Flow verdict:** The flow is clean and minimal. The only friction point is the silent stats update on filter change (noted as P2 above). The rest follows the summary-then-detail pattern correctly.

---

## Summary

| Severity | Count | Items |
|----------|:-----:|-------|
| **P0** | 0 | -- |
| **P1** | 3 | Color-only bar (a11y), Missing semantic region (a11y), Inline styles in skeleton (consistency) |
| **P2** | 4 | Fallback count not visible, No filter-change feedback, No rate qualifier text, Missing forced-colors rules |
| **P3** | 2 | Good cognitive load (informational), Missing entrance animation (polish) |

---

## Verdict: APPROVE (conditional)

**No P0 issues.** The component is well-structured, visually consistent with the existing design system, and functionally complete against the spec.

**3 P1 issues should be addressed this cycle if time permits:**
1. Add a visible legend or SR text below the status bar for color-blind accessibility (WCAG 1.4.1)
2. Wrap stats card in `<section aria-label="...">` for screen reader semantics (WCAG 1.3.1)
3. Replace inline `style` attributes in skeleton with CSS classes (project convention violation)

These P1 items are quick fixes (estimated 15-20 minutes total) and would meaningfully improve accessibility and code quality. The P2 items can be deferred to a future cycle.

---

*Review by PD Agent | Cycle 10 | 2026-02-17*
