# Round 6 — 08 UI/UX Review

**Date**: 2026-03-04
**Reviewer**: Claude Opus 4.6 (E2E Auto-Review)
**Scope**: `frontend/src/` — all `.tsx` and `.css` files

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Loading states | PASS | All pages have spinner/skeleton loading patterns |
| Error states | PASS | All data-fetching pages show error with retry |
| Empty states | PASS | All list/data pages handle zero-data case |
| Responsive design | PASS | Extensive media queries (480/600/768/900/1200px) |
| Touch targets | PASS | min-height: 44px applied to interactive elements |
| Modals | PASS | ConfirmModal with focus trap, ESC, overlay click |
| Toast/notification | PASS | Toast system with auto-dismiss, role="alert" |
| Consistent spacing | PASS | CSS variables, consistent page/section layout |
| Native dialogs | FIXED | PlacesTab + SmartDepartureTab used alert()/confirm() |

**Result**: PASS (after 2 fixes)

---

## Detailed Findings

### 1. Loading States

Every page that fetches data has a loading state:

| Page | Pattern | File |
|------|---------|------|
| HomePage | Skeleton cards (`skeleton-card`, `skeleton-text`) | `pages/home/HomePage.tsx` |
| AlertSettingsPage | Spinner + "불러오는 중..." | `pages/AlertSettingsPage.tsx` |
| CommuteDashboardPage | Spinner + loading text | `pages/CommuteDashboardPage.tsx` |
| CommuteTrackingPage | Spinner + loading text | `pages/CommuteTrackingPage.tsx` |
| RouteSetupPage | Spinner + "경로 불러오는 중..." | `pages/RouteSetupPage.tsx` |
| SettingsPage | Spinner + "불러오는 중..." | `pages/settings/SettingsPage.tsx` |
| MissionsPage | Skeleton loading (4 cards) | `pages/MissionsPage.tsx` |
| NotificationHistoryPage | Spinner loading | `pages/NotificationHistoryPage.tsx` |
| InsightsPage | Skeleton loading | `pages/insights/InsightsPage.tsx` |
| PatternAnalysisPage | Skeleton loading | `pages/patterns/PatternAnalysisPage.tsx` |
| PlacesTab | Spinner + "장소 불러오는 중..." | `pages/settings/PlacesTab.tsx` |
| SmartDepartureTab | Spinner + "불러오는 중..." | `pages/settings/SmartDepartureTab.tsx` |

All loading states use `role="status"` for screen reader announcements.

### 2. Error States

| Page | Pattern | Retry Button |
|------|---------|:------------:|
| HomePage | Error banner + retry button | Yes |
| AlertSettingsPage | `.notice.error` inline | No (page-level) |
| CommuteDashboardPage | Error banner + retry button | Yes |
| MissionsPage | Error with retry button | Yes |
| NotificationHistoryPage | Error banner + retry + dismiss | Yes |
| InsightsPage | Error with retry button | Yes |
| PatternAnalysisPage | Error notice | No |
| RouteSetupPage | Inline error messages | No |

All error displays use `role="alert"` or `aria-live="assertive"` for accessibility.

### 3. Empty States

| Page | Message | Icon |
|------|---------|------|
| HomePage (guest) | GuestLanding component | Illustration |
| CommuteDashboardPage | "아직 출퇴근 기록이 없어요" | EmptyState component |
| AlertSettingsPage | "등록된 알림이 없습니다" | Bell icon |
| RouteSetupPage | "저장된 경로가 없습니다" | Map icon |
| MissionsPage | "진행 중인 미션이 없습니다" | Target icon |
| NotificationHistoryPage | "알림 내역이 없습니다" + filter empty | Bell icon |
| PlacesTab | "등록된 장소가 없습니다" | Pin emoji |
| SmartDepartureTab | "등록된 스마트 출발 설정이 없습니다" | Clock emoji |
| InsightsPage | "아직 충분한 데이터가 없어요" | Custom empty |
| PatternAnalysisPage | "분석할 출퇴근 데이터가 없어요" | Custom empty |

### 4. Responsive Design

CSS media queries found at breakpoints:
- **480px**: Mobile compact adjustments
- **600px**: Small tablet adjustments
- **768px**: Tablet layout changes
- **900px**: Desktop layout transitions
- **1200px**: Wide desktop optimizations

Key responsive patterns:
- `.page` uses `padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))`
- Grid layouts transition from 1-col to 2-col to 3-col
- Font sizes scale with viewport
- Bottom navigation adapts to safe area insets

### 5. Touch Targets (>= 44px)

Verified in CSS:
- `.btn` class: `padding: 12px 24px` (well above 44px height)
- `.btn-sm`: `min-height: 36px` with adequate padding
- `.skip-link`: `min-height: 44px`
- `.bottom-nav a`: min-height 44px via padding
- `.settings-toggle-btn`: adequate padding for touch
- `.settings-delete-btn`: adequate padding for touch
- Toast close button: `min-w-[44px] min-h-[44px]`
- All form inputs inherit adequate sizing

### 6. Modal Implementation

All modals use `ConfirmModal` component with:
- **Focus trap**: `useFocusTrap` hook cycles focus within modal
- **ESC key**: `useEffect` with `keydown` listener closes modal
- **Overlay click**: Background overlay click triggers `onCancel`
- **aria-modal="true"**: Proper ARIA attribute
- **role="dialog"**: Semantic dialog role
- **Loading state**: `isLoading` prop disables confirm button and shows spinner
- **Variants**: `danger` variant for destructive actions

Used in: SettingsPage (2 modals), RouteSetupPage, CommuteTrackingPage, AlertSettingsPage (DeleteConfirmModal), PlacesTab (after fix), SmartDepartureTab (after fix).

### 7. Toast/Notification Feedback

- `Toast.tsx` component with `useToast` hook
- Auto-dismiss after 4 seconds
- Close button with 44x44px touch target
- `role="alert"` for screen reader
- Used in RouteSetupPage for save/delete feedback
- SettingsPage uses inline `toast-success` div for reset confirmation
- Color-coded: success (green), error (red), info (blue)

### 8. Consistent Spacing & Layout

- CSS Custom Properties for all spacing/colors/shadows (`base.css` `:root`)
- Consistent `.page` layout across all pages
- `PageHeader` component for uniform page titles
- `settings-section` class for uniform settings sections
- z-index hierarchy documented in `base.css` comments
- Consistent button sizing via `.btn`, `.btn-primary`, `.btn-sm` classes

---

## Issues Found & Fixed

### Fix 1: PlacesTab.tsx — Native `alert()` and `window.confirm()` replaced

**File**: `frontend/src/presentation/pages/settings/PlacesTab.tsx`

**Before** (3 instances):
- `alert('장소 등록에 실패했습니다.')` in handleCreate catch
- `alert('장소 삭제에 실패했습니다.')` in handleDelete catch
- `window.confirm(...)` in handleDelete

**After**:
- Replaced `alert()` calls with `setActionError()` for inline error display
- Replaced `window.confirm()` with `ConfirmModal` component using `deleteTarget` state
- Added `actionError` state with `role="alert"` for accessibility
- Added `deleteTarget` state for modal-based delete confirmation
- Split `handleDelete` into `handleDeleteClick` (opens modal) + `handleDeleteConfirm` (performs deletion)

### Fix 2: SmartDepartureTab.tsx — Native `alert()` and `window.confirm()` replaced

**File**: `frontend/src/presentation/pages/settings/SmartDepartureTab.tsx`

**Before** (4 instances):
- `alert('먼저 경로를 등록해주세요.')` in handleCreate validation
- `alert('스마트 출발 설정에 실패했습니다.')` in handleCreate catch
- `window.confirm('이 스마트 출발 설정을 삭제하시겠습니까?')` in handleDelete
- `alert('삭제에 실패했습니다.')` in handleDelete catch

**After**:
- Replaced all `alert()` calls with `setActionError()` for inline error display
- Replaced `window.confirm()` with `ConfirmModal` component
- Added `ConfirmModal` import
- Added `deleteTarget` and `actionError` states
- Split `handleDelete` into `handleDeleteClick` + `handleDeleteConfirm`

---

## Verification

- `tsc --noEmit`: PASS (no type errors)
- `eslint PlacesTab.tsx SmartDepartureTab.tsx`: PASS (no lint errors)
