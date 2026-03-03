# Round 4 - UI/UX E2E Review

**Date**: 2026-02-13
**URL**: https://frontend-xi-two-52.vercel.app
**Viewports tested**: 375x812 (mobile), 768x1024 (tablet), 1920x1080 (desktop)

## Summary

| Category | Status |
|----------|--------|
| Responsive Layout | PASS |
| Horizontal Overflow | PASS |
| Bottom Navigation | PASS |
| Page Layouts | PASS |
| Accessibility Tree Leak | FIX APPLIED |
| Typography & Spacing | PASS |
| Interactive Elements | PASS |
| Empty/Auth States | PASS |
| 404 Page | PASS |

## Viewport: 375px (Mobile)

### HomePage (Guest Landing)
- Hero section: headline, subtitle, CTA button all render correctly
- Feature cards stack vertically (1-column layout via `@media (max-width: 600px)`)
- Feature cards use horizontal row layout with number badge on mobile -- clean
- Footer "출퇴근 메이트" is visible when fully scrolled (5px clearance above bottom nav)
- No horizontal overflow detected (scrollWidth === clientWidth === 375)

### Routes Page
- PageHeader with back button renders correctly
- Login prompt centered with icon, message, and CTA button
- Bottom nav properly highlighted on "경로" tab

### Alerts Page
- Header "알림" left-aligned
- Warning notice with "!" icon (CSS `::after` with `order: -1`) renders correctly
- Footer visible above bottom nav

### Settings Page
- Lock icon, "로그인이 필요해요" message centered
- Login CTA button renders correctly
- Bottom nav properly highlighted

### Login Page
- Navigation bar with "출퇴근 메이트" brand + "홈" link
- Form card: email input, password input with show/hide toggle, submit button
- "회원가입" toggle below form
- Footer with copyright -- no bottom nav (hidden on /login)

## Viewport: 768px (Tablet)

### HomePage (Guest Landing)
- Feature cards switch to 3-column grid layout -- clean
- Hero section properly centered
- CTA button has good width constraint (max-width: 400px)
- Bottom nav constrained to max-width 768px, centered

### Alerts Page
- Warning notice properly spans width
- Footer section visible

### Login Page
- Form card centered, proper width
- Bottom nav hidden (correct)

## Viewport: 1920px (Desktop)

### HomePage (Guest Landing)
- Content constrained to max-width 720px (`.guest-page`)
- Feature cards 3-column, properly centered
- Bottom nav constrained to max-width 768px centered -- appropriate for mobile-first PWA
- No excessive whitespace or broken layouts

### Settings Page
- Content properly constrained to max-width 1000px (`.page`)
- Login state centered

### 404 Page
- "404" large text, error message, action buttons centered
- Clean layout at all viewports

## Issue Found & Fixed

### [FIX] AlertSettingsPage: Wizard content leaks to accessibility tree

**File**: `frontend/src/presentation/pages/AlertSettingsPage.tsx` (line 800)

**Problem**: The wizard container (`#wizard-content`) is hidden via inline `style={{ display: 'none' }}` when the user is not logged in or the wizard is collapsed. However, it lacked `aria-hidden="true"`, causing its content ("단계 ✓ ✓" from the step indicator) to leak into the accessibility tree. Screen readers would announce invisible wizard content.

**Evidence**: Playwright snapshot showed `text: 단계 ✓ ✓` as a direct text node inside `<main>` despite the wizard being visually hidden.

**Fix applied**: Added `aria-hidden` attribute that syncs with the display:none condition:
```tsx
// Before
<div id="wizard-content" className="wizard-container"
  style={{ display: ... ? 'none' : undefined }}>

// After
<div id="wizard-content" className="wizard-container"
  style={{ display: ... ? 'none' : undefined }}
  aria-hidden={... ? true : undefined}>
```

**Build verification**: `npx tsc --noEmit` and `npm run build` both pass cleanly.

## Items Reviewed (No Issues)

| Item | Result |
|------|--------|
| Mobile horizontal scroll (375px) | No overflow on any page |
| Touch targets (min 44x44px) | Bottom nav items have min-height: 44px, min-width: 52px |
| Font readability | Pretendard font renders cleanly, line-height: 1.6 |
| Color contrast | Primary (#6366f1) on white background -- sufficient contrast |
| Focus styles | `:focus-visible` with 2px solid primary + offset 2px on all interactive elements |
| Skip link | "본문으로 건너뛰기" present on homepage and login |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables animations |
| High contrast | `@media (forced-colors: active)` adds borders for visibility |
| Safe area insets | `env(safe-area-inset-*)` used for padding on all pages |
| Bottom nav z-index hierarchy | Documented at top of CSS (1000 for nav, 1100 for modals) |
| Page gap consistency | All pages use `gap: 40px` for section spacing |
| Guest vs Auth states | All pages handle both states with proper messaging |
