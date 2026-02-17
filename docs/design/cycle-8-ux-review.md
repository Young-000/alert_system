## UX/UI Review: Cycle 8 -- SVG Icon System (N-2)

> Reviewer: PD Agent | Date: 2026-02-17
> Scope: N-2 (SVG Icon System). N-1 (Jest to Vitest) is infrastructure-only with no user-facing changes -- excluded from UX review.

---

### 5-Second Test

- **First impression:** Not applicable -- the icon system is an internal developer API. The user-facing output (ChevronIcon in collapsible sections) should look identical to before.
- **Clarity:** The icon API (`size`, `className`, `ariaLabel`) is immediately understandable. A developer can import and use any icon in under 10 seconds.
- **CTA visibility:** N/A (developer tooling, not end-user UI).

---

### What Works Well

| Positive | Design Principle |
|----------|-----------------|
| **Simplified IconProps** -- Dev reduced the spec's 6 props (`size`, `className`, `color`, `strokeWidth`, `ariaHidden`, `ariaLabel`) to 3 (`size`, `className`, `ariaLabel`). `color` defaults to `currentColor` (inherits from parent), `strokeWidth` is hardcoded per icon. This is correct: fewer props = less cognitive load for the developer consumer (Hick's Law). | Hick's Law: fewer decisions = faster usage |
| **`aria-hidden` / `ariaLabel` toggle** -- When `ariaLabel` is provided, `aria-hidden` is removed and `role="img"` is added. When not provided, `aria-hidden="true"` is set. This is the correct WCAG pattern for decorative vs. meaningful icons. | WCAG 1.1.1 Non-text Content |
| **`role="img"` on labeled icons** -- Adding `role="img"` when `ariaLabel` is present ensures screen readers announce the icon as an image with a label, rather than ignoring it. Correct implementation. | WCAG 4.1.2 Name, Role, Value |
| **ChevronIcon default size = 16** -- Unlike the other 6 icons (default 24), ChevronIcon defaults to 16, matching its actual usage in collapsible sections. This prevents every call site from needing `size={16}`. Good domain-aware default. | Nielsen H6: Recognition rather than recall |
| **CSS class-based rotation preserved** -- The `collapsible-chevron` + `collapsible-chevron--expanded` CSS pattern with `transform: rotate(180deg)` and `transition: 0.2s ease` is maintained exactly as before. The `className` prop passes these classes through. Zero visual regression risk for the expand/collapse animation. | Consistency (Nielsen H4) |
| **`readonly` props in IconProps type** -- All props are marked `readonly`, enforcing immutability at the type level per project conventions. | Code quality (Kent Beck: Fewest elements) |
| **Comprehensive test coverage** -- `icons.test.tsx` covers all 7 icons with `describe.each`, testing default size, custom size, aria-hidden default, ariaLabel toggle, className passthrough, and stroke/fill defaults. Plus dedicated ChevronIcon collapsible usage tests. | Testing: Behavior-based tests |
| **Barrel export** -- `index.ts` provides clean public API. Consumers import from `@presentation/components/icons` without knowing internal file structure. | Encapsulation, DRY |

---

### Visual Regression Analysis: ChevronIcon

Comparing the **old** local `ChevronIcon` (Cycle 7) with the **new** shared `ChevronIcon`:

| Attribute | Old (local in WeatherHeroSection/StatsSection) | New (shared component) | Match? |
|-----------|-----------------------------------------------|----------------------|--------|
| `width` | `"16"` (string) | `{16}` (number, via `size` prop default) | Yes -- renders identically |
| `height` | `"16"` (string) | `{16}` (number) | Yes |
| `viewBox` | `"0 0 24 24"` | `"0 0 24 24"` | Yes |
| `fill` | `"none"` | `"none"` | Yes |
| `stroke` | `"currentColor"` | `"currentColor"` | Yes |
| `strokeWidth` | `"2"` | `"2"` | Yes |
| `strokeLinecap` | `"round"` | `"round"` | Yes |
| `strokeLinejoin` | `"round"` | `"round"` | Yes |
| `aria-hidden` | `"true"` (always) | `true` (when no `ariaLabel`) | Yes -- functionally identical for current usage |
| `className` | `collapsible-chevron [+ --expanded]` (internal) | Passed via `className` prop externally | Yes -- same classes applied |
| `<polyline>` | `points="6 9 12 15 18 9"` | `points="6 9 12 15 18 9"` | Yes |

**Verdict: Zero visual regression.** The SVG output is attribute-for-attribute identical. The only structural change is that the `className` is now composed by the caller rather than internally, which is the correct inversion of control for a shared component.

---

### Issues Found

| Priority | Heuristic/Principle | Location | Current | Proposed Fix | Rationale |
|----------|-------------------|----------|---------|-------------|-----------|
| P3 | Consistency (Nielsen H4) | `types.ts` -- `IconProps` | Spec proposed `color` and `strokeWidth` as configurable props. Dev hardcoded them per icon (e.g., CheckIcon has `strokeWidth="3"`, others have `"2"`). | No change needed this cycle. If a future icon needs a different stroke color (not `currentColor`), add `color` prop then. YAGNI applies -- there are zero current use cases for non-`currentColor` icons. | Spec over-designed; dev's simplification is correct. Log for reference only. |
| P3 | Consistency (Nielsen H4) | `types.ts` -- `IconProps` | Spec proposed a `direction` prop on `ChevronIcon` (`up`/`down`/`left`/`right`). Dev omitted it. | No change needed. Current usage only needs down + CSS rotation for up. If left/right chevrons are needed later, add `direction` then. | YAGNI. The CSS rotation pattern (`collapsible-chevron--expanded`) handles the only current direction change. |
| P3 | Progressive migration | `WeatherHeroSection.tsx` lines 84-88, 129 | Two inline SVGs remain: a MapPin (12x12) and a Check (14x14, strokeWidth 3). These could use the new shared `MapPinIcon` and `CheckIcon`. | Consider migrating in a future cycle. Not blocking -- spec explicitly states "Won't have: full 136 inline SVG replacement." | Incremental improvement. These are small, localized uses. Not worth blocking this cycle. |

---

### Accessibility Notes

1. **Decorative icons (default):** All 7 icons render with `aria-hidden="true"` by default. This is correct -- most icons in this app accompany visible text labels (e.g., the chevron next to "weather summary text"). Screen readers will read the text, not the icon.

2. **Meaningful icons:** When `ariaLabel` is provided, the icon switches to `role="img"` + `aria-label="..."` + no `aria-hidden`. This correctly makes the icon announced by screen readers. The test suite verifies this behavior.

3. **No missing labels found:** In both `WeatherHeroSection.tsx` (line 60) and `StatsSection.tsx` (line 64), the `ChevronIcon` is used without `ariaLabel`, which is correct because the parent `<div>` already has `aria-label="weather detail expand/collapse"` and `role="button"` via the `useCollapsible` hook's `ariaProps`. The chevron is purely decorative in this context.

4. **Remaining inline SVGs in WeatherHeroSection:** The MapPin icon at line 84 has `aria-hidden="true"` (correct, it accompanies the "Seoul" text). The Check icon at line 129 is inside a `<span>` with `aria-hidden="true"` (correct, the button has `aria-pressed` state). No accessibility regressions.

---

### Implementation Suggestions

None required this cycle. The implementation is clean and matches the spec's intent with justified simplifications.

For future cycles, when migrating more inline SVGs to the icon system:
- The inline MapPin at `WeatherHeroSection.tsx:84` uses `size={12}` which differs from `MapPinIcon`'s default of 24. The `size` prop handles this correctly.
- The inline Check at `WeatherHeroSection.tsx:129` uses `strokeWidth="3"` which matches `CheckIcon`'s hardcoded `strokeWidth="3"`. Direct replacement possible.

---

### Summary

| Category | Assessment |
|----------|-----------|
| API cleanliness | Clean. 3 props is the right number. `size`, `className`, `ariaLabel` cover all current use cases. |
| Accessibility defaults | Correct. `aria-hidden="true"` by default, `role="img"` + `aria-label` when labeled. |
| Visual regression risk | None. Attribute-for-attribute identical SVG output confirmed. CSS animation classes preserved. |
| Consistency across icons | Good. All 7 icons follow the same structural pattern (same SVG wrapper, same aria logic, same prop interface). |
| Test coverage | Thorough. 7 icons x 6 test cases + 2 ChevronIcon-specific tests = comprehensive. |

---

### Verdict: **APPROVE** (0 P0, 0 P1, 0 P2, 3 P3)

No blocking issues. The SVG Icon System is well-implemented with correct accessibility defaults, zero visual regression, and a clean developer API. The 3 P3 items are enhancement suggestions for future cycles, not problems with the current implementation.
