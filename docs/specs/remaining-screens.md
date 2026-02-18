# P1-4: Remaining Screens (경로 설정 + 설정 + 알림 기록)

> Cycle 27 | Branch: `feature/remaining-screens`

---

## JTBD

**경로 관리:**
When I want to manage my commute routes on my phone, I want to add, edit, and delete routes with checkpoints, so I can keep my commute information accurate and get personalized alerts.

**알림 기록:**
When I wonder whether my morning alerts were actually sent, I want to see a history of past notifications with their status, so I can trust the system is working and troubleshoot failures.

**설정 강화:**
When I want to quickly access different features or check app info, I want shortcut links and version details in settings, so I can navigate efficiently and know what version I'm running.

---

## Problem

- **Who:** Daily commuters using the alert system mobile app
- **Pain:** High frequency (daily usage). Three tab screens are placeholders -- users cannot manage routes, view notification history, or access app info from the mobile app. They must fall back to the PWA for these features.
- **Current workaround:** Use the web PWA (`frontend-xi-two-52.vercel.app`) for route management and notification history
- **Success metric:** All three tabs are functional; user can complete full route CRUD, view notification history, and access settings without leaving the native app

---

## Solution

### Overview

Replace the three placeholder tab screens with fully functional implementations that reuse the existing backend API. The mobile app already has established patterns (service layer, hooks, component architecture) from P1-2 (Home) and P1-3 (Alerts). This cycle follows the same patterns for consistency.

### User Flows

**Route Management Flow:**
```
[Commute Tab] → See route list
                    ├─ [Empty state] → Tap "경로 추가" → [Route Form Modal]
                    ├─ [Has routes] → Tap route card → [Route Form Modal (edit)]
                    ├─ Swipe left → [Delete confirmation]
                    └─ Tap star icon → [Toggle preferred]
```

**Notification History Flow:**
```
[Commute Tab] → Scroll to "알림 기록" section
                    ├─ [Empty state] → "알림 기록이 없어요"
                    ├─ [Has records] → See list with status badges
                    └─ Pull-to-refresh → Reload both routes + history
```

**Settings Flow:**
```
[Settings Tab] → See profile card (existing)
                    ├─ "알림 설정" → Navigate to alerts tab
                    ├─ "경로 관리" → Navigate to commute tab
                    ├─ "앱 정보" → Expand to show version, licenses
                    └─ "로그아웃" → Confirm modal (existing)
```

### Scope (MoSCoW)

**Must have:**
- Route list display (name, type, checkpoint count, estimated duration)
- Route create with form modal (name, type, checkpoints CRUD)
- Route edit (pre-populate form with existing data)
- Route delete (confirmation dialog)
- Route preferred toggle (star icon, optimistic update)
- Notification history list (time, alert name, type icons, status badge)
- Notification stats summary (total/success/failed counts)
- Settings: shortcut links to alerts tab and commute tab
- Settings: app info section (version number)
- Empty states for routes and notification history
- Loading skeleton states
- Error states with retry
- Guest (non-logged-in) view with login prompt
- Pull-to-refresh on commute tab

**Should have:**
- Swipe-to-delete on route cards (reuse `SwipeableRow` from alerts)
- Checkpoint type icons in route cards
- Transport mode badges in route form
- Notification status color-coded badges (success=green, failed=red, fallback=yellow)

**Could have:**
- Route type filter tabs (morning/evening/custom)
- Notification history pagination ("load more" button)
- Animated transitions on route preferred toggle

**Won't have (this cycle):**
- Route templates (pre-built routes)
- Route map visualization
- Notification detail view (tap to expand)
- Push notification settings (OS-level permissions)
- Account deletion
- Theme/language settings
- Open-source licenses page (just show version for now)

---

## Screen 1: Commute Tab (`commute.tsx`)

### Layout Structure

The commute tab is divided into two scrollable sections within a single `ScrollView`:

```
┌──────────────────────────────────┐
│ 출퇴근                    2/3개  │  ← Header with count
├──────────────────────────────────┤
│ ┌─── Route Section ───────────┐ │
│ │ 내 경로                 + │ │  ← Section header + add button
│ │                             │ │
│ │ ┌─ RouteCard ─────────────┐ │ │
│ │ │ ★ 출근 경로     morning │ │ │
│ │ │ 3개 체크포인트 · 약 45분 │ │ │
│ │ └─────────────────────────┘ │ │
│ │ ┌─ RouteCard ─────────────┐ │ │
│ │ │ ☆ 퇴근 경로     evening │ │ │
│ │ │ 2개 체크포인트 · 약 30분 │ │ │
│ │ └─────────────────────────┘ │ │
│ └─────────────────────────────┘ │
│                                  │
│ ┌─── History Section ─────────┐ │
│ │ 알림 기록                   │ │  ← Section header
│ │ ┌─ StatsSummary ──────────┐ │ │
│ │ │ 총 24 · 성공 22 · 실패 2│ │ │
│ │ └─────────────────────────┘ │ │
│ │ ┌─ NotificationItem ──────┐ │ │
│ │ │ 06:30  출근 알림  ✅    │ │ │
│ │ └─────────────────────────┘ │ │
│ │ ┌─ NotificationItem ──────┐ │ │
│ │ │ 06:30  출근 알림  ❌    │ │ │
│ │ └─────────────────────────┘ │ │
│ └─────────────────────────────┘ │
└──────────────────────────────────┘
```

### Component Hierarchy

```
CommuteScreen (commute.tsx)
├── GuestCommuteView                    — Non-logged-in state
├── LoadingSkeleton                     — Loading state (inline)
├── ErrorView                          — Error state with retry (inline)
└── ScrollView (RefreshControl)
    ├── RouteSection
    │   ├── SectionHeader ("내 경로", count, + button)
    │   ├── EmptyRouteView             — No routes empty state
    │   └── RouteCard[]                — List of routes
    │       ├── PreferredToggle (star)
    │       ├── Route metadata (name, type badge, checkpoints, duration)
    │       └── SwipeableRow (swipe-to-delete)
    ├── NotificationHistorySection
    │   ├── SectionHeader ("알림 기록")
    │   ├── NotificationStatsSummary   — Total/success/failed pills
    │   ├── EmptyHistoryView           — No history empty state
    │   └── NotificationItem[]         — History list items
    └── RouteFormModal                 — Create/edit route form
        ├── Name input
        ├── RouteTypeSelector (morning/evening/custom)
        ├── CheckpointList
        │   ├── CheckpointRow[]
        │   │   ├── Name input
        │   │   ├── CheckpointTypeSelector
        │   │   ├── TransportModeSelector
        │   │   ├── Duration inputs (expectedDurationToNext, expectedWaitTime)
        │   │   └── Delete button (if > 2 checkpoints)
        │   └── "체크포인트 추가" button
        └── Save/Cancel buttons
```

### Acceptance Criteria

- [ ] Given a logged-in user with 0 routes, When they open the commute tab, Then they see an empty state with "등록된 경로가 없어요" message and an "경로 추가" button
- [ ] Given a logged-in user with routes, When they open the commute tab, Then they see a list of route cards showing: name, route type badge, checkpoint count, and estimated total duration
- [ ] Given a logged-in user, When they tap the "+" button in the route section header, Then a modal opens with an empty route form (name, type selector, 2 default checkpoints)
- [ ] Given a user filling out the route form, When they tap "체크포인트 추가", Then a new checkpoint row is appended to the list
- [ ] Given a user with 3+ checkpoints, When they tap delete on a checkpoint, Then that checkpoint is removed (minimum 2 checkpoints enforced)
- [ ] Given a user with exactly 2 checkpoints, When they try to delete one, Then the delete button is disabled/hidden
- [ ] Given a valid route form, When the user taps "저장", Then the route is created via `POST /routes`, the modal closes, and the route list refreshes
- [ ] Given a user tapping a route card, When the form modal opens, Then it is pre-populated with the route's existing data (name, type, checkpoints)
- [ ] Given a user editing a route, When they tap "저장", Then the route is updated via `PATCH /routes/:id` and the list refreshes
- [ ] Given a user swiping left on a route card, When they tap the delete action, Then a confirmation dialog appears; confirming deletes via `DELETE /routes/:id`
- [ ] Given a user tapping the star icon on a route card, Then `isPreferred` toggles optimistically via `PATCH /routes/:id` with `{ isPreferred: !current }`
- [ ] Given a logged-in user, When the commute tab loads, Then the notification history section shows stats (total, success, failed) and recent notification items
- [ ] Given notification history items, When displayed, Then each item shows: sent time (HH:mm format), alert name, alert type icons, and status badge (success=green, failed=red, fallback=yellow)
- [ ] Given 0 notification history items, When displayed, Then an empty state shows "알림 기록이 없어요"
- [ ] Given a non-logged-in user, When they open the commute tab, Then they see a guest view prompting login
- [ ] Given a logged-in user, When they pull down on the commute tab, Then both routes and notification history refresh
- [ ] Given an API error loading routes or history, When displayed, Then an error message with a "다시 시도" button appears

---

## Screen 2: Settings Tab Enhancement (`settings.tsx`)

### Layout Structure

```
┌──────────────────────────────────┐
│ 설정                             │  ← Header
├──────────────────────────────────┤
│ ┌─ ProfileCard ─────────────────┐│
│ │ [Avatar] 홍길동               ││
│ │          hong@email.com       ││
│ └───────────────────────────────┘│
│                                  │
│ ┌─ QuickLinks Section ──────────┐│
│ │ 🔔 알림 설정              >  ││
│ │ 🚇 경로 관리              >  ││
│ └───────────────────────────────┘│
│                                  │
│ ┌─ App Info Section ────────────┐│
│ │ 앱 정보                       ││
│ │ 버전       1.0.0              ││
│ │ 빌드       2026.02.19         ││
│ └───────────────────────────────┘│
│                                  │
│ ┌─ Danger Zone ─────────────────┐│
│ │ [로그아웃]                    ││
│ └───────────────────────────────┘│
└──────────────────────────────────┘
```

### Component Hierarchy

```
SettingsScreen (settings.tsx)
├── ScrollView
│   ├── ProfileCard (existing, preserved)
│   │   ├── Avatar circle
│   │   └── Name + Email
│   ├── QuickLinksSection (NEW)
│   │   ├── LinkRow ("알림 설정", icon, onPress → router.push('/alerts'))
│   │   └── LinkRow ("경로 관리", icon, onPress → router.push('/commute'))
│   ├── AppInfoSection (NEW)
│   │   ├── InfoRow ("버전", Constants.expoConfig.version)
│   │   └── InfoRow ("빌드", build date or number)
│   └── LogoutSection (existing, preserved)
│       └── LogoutButton + ConfirmModal
```

### Acceptance Criteria

- [ ] Given a logged-in user, When they open the settings tab, Then they see: profile card (existing), quick links section, app info section, and logout button
- [ ] Given a user tapping "알림 설정" in quick links, When the navigation occurs, Then the alerts tab is selected
- [ ] Given a user tapping "경로 관리" in quick links, When the navigation occurs, Then the commute tab is selected
- [ ] Given the app info section, When displayed, Then it shows the app version from `expo-constants` and a build identifier
- [ ] Given a non-logged-in user, When they open the settings tab, Then the quick links section is still visible (but profile card shows guest state)
- [ ] Given the existing profile card and logout flow, When the settings tab is enhanced, Then existing functionality (profile display, logout confirm modal) is preserved exactly

---

## API Contract Mapping

### Routes API (경로 관리)

| Action | Method | Endpoint | Request Body | Response | Notes |
|--------|--------|----------|--------------|----------|-------|
| List user routes | GET | `/routes/user/:userId` | - | `RouteResponse[]` | Optional `?type=morning` filter |
| Create route | POST | `/routes` | `CreateRouteDto` | `RouteResponse` | Must include checkpoints array |
| Update route | PATCH | `/routes/:id` | `UpdateRouteDto` | `RouteResponse` | Partial update, checkpoints optional |
| Delete route | DELETE | `/routes/:id` | - | void | Returns 204 |

### Notification API (알림 기록)

| Action | Method | Endpoint | Request Body | Response | Notes |
|--------|--------|----------|--------------|----------|-------|
| Get history | GET | `/notifications/history?limit=20&offset=0` | - | `NotificationHistoryResponse` | JWT auth, no userId param needed |
| Get stats | GET | `/notifications/stats` | - | `NotificationStatsDto` | Optional `?days=N` filter |

### Existing APIs Referenced

| Action | Method | Endpoint | Used By |
|--------|--------|----------|---------|
| Get user profile | GET | `/users/:id` | Settings (profile card, already used by `useAuth`) |

---

## Data Types

### Types to Create in `mobile/src/types/`

All route types already exist in `mobile/src/types/home.ts`. The following types need to be added for notification history and route CRUD operations.

**New file: `mobile/src/types/route.ts`** (extracted for clarity, or add to `home.ts`):

```typescript
// Re-export existing types from home.ts
export type { RouteType, CheckpointType, TransportMode, CheckpointResponse, RouteResponse } from './home';

// Route form DTOs (match backend exactly)
export type CreateCheckpointDto = {
  sequenceOrder: number;
  name: string;
  checkpointType: CheckpointType;
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  expectedDurationToNext?: number;
  expectedWaitTime?: number;
  transportMode?: TransportMode;
};

export type CreateRouteDto = {
  userId: string;
  name: string;
  routeType: RouteType;
  isPreferred?: boolean;
  checkpoints: CreateCheckpointDto[];
};

export type UpdateRouteDto = {
  name?: string;
  routeType?: RouteType;
  isPreferred?: boolean;
  checkpoints?: CreateCheckpointDto[];
};
```

**New file: `mobile/src/types/notification.ts`:**

```typescript
export type NotificationLog = {
  id: string;
  alertId: string;
  alertName: string;
  alertTypes: string[];
  status: string;        // 'success' | 'fallback' | 'failed'
  summary: string;
  sentAt: string;        // ISO datetime string
};

export type NotificationHistoryResponse = {
  items: NotificationLog[];
  total: number;
};

export type NotificationStatsDto = {
  total: number;
  success: number;
  fallback: number;
  failed: number;
  successRate: number;   // 0-100
};
```

### Existing Types Referenced (no changes needed)

From `mobile/src/types/home.ts`:
- `RouteType` = `'morning' | 'evening' | 'custom'`
- `CheckpointType` = `'home' | 'subway' | 'bus_stop' | 'transfer_point' | 'work' | 'custom'`
- `TransportMode` = `'walk' | 'subway' | 'bus' | 'transfer' | 'taxi' | 'bike'`
- `CheckpointResponse` (route checkpoint with all fields)
- `RouteResponse` (full route with checkpoints array)

From `mobile/src/types/auth.ts`:
- `AuthUser` (used by `useAuth` hook)

---

## Service Layer

### New file: `mobile/src/services/route.service.ts`

```typescript
import { apiClient } from './api-client';
import type { RouteResponse } from '@/types/home';
import type { CreateRouteDto, UpdateRouteDto } from '@/types/route';

export const routeService = {
  async fetchRoutes(userId: string): Promise<RouteResponse[]> {
    return apiClient.get<RouteResponse[]>(`/routes/user/${userId}`);
  },

  async createRoute(dto: CreateRouteDto): Promise<RouteResponse> {
    return apiClient.post<RouteResponse, CreateRouteDto>('/routes', dto);
  },

  async updateRoute(id: string, dto: UpdateRouteDto): Promise<RouteResponse> {
    return apiClient.patch<RouteResponse, UpdateRouteDto>(`/routes/${id}`, dto);
  },

  async deleteRoute(id: string): Promise<void> {
    await apiClient.delete(`/routes/${id}`);
  },
};
```

### New file: `mobile/src/services/notification.service.ts`

```typescript
import { apiClient } from './api-client';
import type { NotificationHistoryResponse, NotificationStatsDto } from '@/types/notification';

export const notificationService = {
  async fetchHistory(limit = 20, offset = 0): Promise<NotificationHistoryResponse> {
    return apiClient.get<NotificationHistoryResponse>(
      `/notifications/history?limit=${limit}&offset=${offset}`,
    );
  },

  async fetchStats(days = 0): Promise<NotificationStatsDto> {
    return apiClient.get<NotificationStatsDto>(
      `/notifications/stats${days ? `?days=${days}` : ''}`,
    );
  },
};
```

---

## State Management Approach

### Hook: `useRoutes` (`mobile/src/hooks/useRoutes.ts`)

Follows the same pattern as `useAlerts`:

```
State:
  routes: RouteResponse[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  isSaving: boolean

Actions:
  refresh() → re-fetches route list
  createRoute(dto) → POST, refresh list, return success boolean
  updateRoute(id, dto) → PATCH, refresh list, return success boolean
  deleteRoute(id) → DELETE, optimistic remove from list
  togglePreferred(id) → optimistic toggle + PATCH { isPreferred: !current }
```

Key implementation details:
- `togglePreferred` uses optimistic update with rollback (same pattern as `toggleAlert` in `useAlerts`)
- `createRoute` auto-injects `userId` from `useAuth`
- `fetchRoutes` sorts by: preferred first, then by name alphabetically
- Guard: if `!user`, skip fetch and set `isLoading: false`

### Hook: `useNotificationHistory` (`mobile/src/hooks/useNotificationHistory.ts`)

```
State:
  items: NotificationLog[]
  stats: NotificationStatsDto | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null

Actions:
  refresh() → re-fetches both history and stats
```

Key implementation details:
- Fetches both `/notifications/history` and `/notifications/stats` in parallel via `Promise.allSettled`
- Stats failure is non-critical (show items without stats)
- History failure shows error state
- JWT token handles user identification (no `userId` param needed)

### Hook: `useCommuteTab` (optional orchestrator)

If the commute tab wants a single unified hook:

```
Composes: useRoutes() + useNotificationHistory()

Exposes:
  Combined isLoading (both loaded)
  Single refresh() that refreshes both
  All individual state/actions
```

Decision for developer: either compose in the screen component directly or create a thin orchestrator. Composing directly is simpler and recommended for this scope.

---

## Component Specifications

### RouteCard

```
Props:
  route: RouteResponse
  onPress: () => void           — opens edit modal
  onTogglePreferred: () => void — toggles star
  onDelete: () => void          — triggers delete confirmation

Display:
  - Star icon (filled if isPreferred, outline if not) — left side
  - Route name — bold, primary text
  - Route type badge — colored pill (morning=blue, evening=orange, custom=gray)
  - "{N}개 체크포인트 · 약 {M}분" — secondary text
  - M = totalExpectedDuration ?? sum of checkpoint durations

Route type badge labels:
  morning → "출근"   (blue pill)
  evening → "퇴근"   (orange pill)
  custom  → "커스텀" (gray pill)
```

### RouteFormModal

```
Props:
  visible: boolean
  editingRoute: RouteResponse | null   — null = create mode
  isSaving: boolean
  onClose: () => void
  onSave: (dto: CreateRouteDto | UpdateRouteDto) => void

Internal State:
  name: string
  routeType: RouteType (default: 'morning')
  checkpoints: CheckpointFormItem[] (default: 2 items — home + work)

CheckpointFormItem = {
  tempId: string                 — for React key (uuid or counter)
  name: string
  checkpointType: CheckpointType (default: 'custom')
  transportMode?: TransportMode
  expectedDurationToNext?: number
  expectedWaitTime?: number
}

Validation rules:
  - name: required, 1-50 characters
  - checkpoints: minimum 2
  - each checkpoint.name: required
  - Save button disabled while name empty OR any checkpoint name empty OR isSaving

On save:
  - Map CheckpointFormItem[] to CreateCheckpointDto[] with sequenceOrder = index
  - If editingRoute: call onSave with UpdateRouteDto
  - If creating: call onSave with CreateRouteDto (userId injected by hook)
```

### CheckpointRow

```
Props:
  checkpoint: CheckpointFormItem
  index: number
  canDelete: boolean            — false if total checkpoints <= 2
  onChange: (updated: CheckpointFormItem) => void
  onDelete: () => void

Display:
  - Sequence number circle (index + 1)
  - Name TextInput
  - CheckpointType selector (horizontal scroll of pills)
  - TransportMode selector (if not last checkpoint)
  - Duration input (expectedDurationToNext, minutes, number keyboard)
  - Wait time input (expectedWaitTime, minutes, number keyboard)
  - Delete button (trash icon, hidden if canDelete=false)

CheckpointType pill labels:
  home → "집"
  subway → "지하철"
  bus_stop → "버스정류장"
  transfer_point → "환승"
  work → "회사"
  custom → "기타"

TransportMode pill labels:
  walk → "도보"
  subway → "지하철"
  bus → "버스"
  transfer → "환승"
  taxi → "택시"
  bike → "자전거"
```

### NotificationStatsSummary

```
Props:
  stats: NotificationStatsDto | null

Display (horizontal row of 3 pills):
  - "총 {total}" — gray background
  - "성공 {success}" — green background
  - "실패 {failed}" — red background

If stats is null: show nothing (graceful degradation)
```

### NotificationItem

```
Props:
  item: NotificationLog

Display (single row):
  - Time: sentAt formatted as "HH:mm" (left)
  - Alert name: alertName (center, bold)
  - Type icons: map alertTypes to icons (inline, small)
      weather → "🌤"
      airQuality → "😷"
      bus → "🚌"
      subway → "🚇"
  - Status badge (right):
      'success' → green dot + "성공"
      'fallback' → yellow dot + "대체"
      'failed' → red dot + "실패"
      other → gray dot + status text
```

### QuickLinksSection (Settings)

```
Props: none (uses expo-router navigation)

Renders:
  - SectionHeader: "바로가기"
  - LinkRow: icon="🔔", label="알림 설정", onPress → router.navigate('/(tabs)/alerts')
  - LinkRow: icon="🚇", label="경로 관리", onPress → router.navigate('/(tabs)/commute')

LinkRow layout:
  [icon] [label]                              [chevron >]
```

### AppInfoSection (Settings)

```
Props: none (reads from expo-constants)

Renders:
  - SectionHeader: "앱 정보"
  - InfoRow: label="버전", value=Constants.expoConfig?.version ?? '1.0.0'
  - InfoRow: label="빌드", value=Constants.expoConfig?.extra?.buildDate ?? '-'

InfoRow layout:
  [label]                                     [value]
```

---

## Edge Cases and Error Handling

### Route Management

| Scenario | Handling |
|----------|---------|
| User has 0 routes | Show `EmptyRouteView` with illustration + "경로 추가" CTA button |
| Route create fails (network) | Show `Alert.alert` with error message, keep modal open with data preserved |
| Route create fails (validation) | Backend returns 400 -- show "입력을 확인해주세요" alert |
| Route delete fails | Rollback: re-add to list, show error alert |
| Preferred toggle fails | Rollback: revert star state, silent (no error toast for minor action) |
| User tries to delete checkpoint when only 2 remain | Delete button hidden/disabled; minimum 2 enforced in UI |
| Route with no checkpoints from backend | Should not happen (backend enforces), but guard: show route card with "0개 체크포인트" |
| Very long route name | Truncate with ellipsis in card, full name in form |
| `totalExpectedDuration` is null | Calculate from checkpoints: sum of `expectedDurationToNext` values; if all null, show "-- 분" |
| Concurrent preferred toggle (double tap) | Use ref-based guard (same pattern as `togglingIds` in `useAlerts`) |

### Notification History

| Scenario | Handling |
|----------|---------|
| User has 0 notification history | Show `EmptyHistoryView` with "알림 기록이 없어요" message |
| History loads but stats fails | Show history items without stats summary (graceful degradation) |
| History fails entirely | Show error in history section only (routes section still works) |
| Notification with unknown `alertTypes` values | Render without icon, just show text |
| Very old notification dates | Show full date "MM/DD HH:mm" if not today; "HH:mm" if today |

### Settings

| Scenario | Handling |
|----------|---------|
| `expo-constants` version is undefined | Show "1.0.0" as fallback |
| Navigation to another tab | Use `router.navigate()` (not `push`), replaces within tab navigator |
| Non-logged-in user views settings | Show guest profile card (existing), quick links still visible, app info visible, logout hidden |

### Authentication

| Scenario | Handling |
|----------|---------|
| Non-logged-in user opens commute tab | Show `GuestCommuteView` (same pattern as `GuestAlertView`) |
| Token expires during operation | `apiClient` fires `onUnauthorized` callback, redirects to login (existing behavior) |
| Auth loading state | Show skeleton, same as alerts tab pattern |

### General

| Scenario | Handling |
|----------|---------|
| Pull-to-refresh | `RefreshControl` on `ScrollView`; refreshes routes + notification history in parallel |
| App returns from background | Do NOT auto-refresh on commute tab (unlike home tab's transit data). Routes/history are not time-sensitive |
| Slow network | 30s timeout (existing `apiClient` config), then error state |
| Empty string in number input (duration/wait) | Parse as undefined/null, not 0. Backend treats null as "not specified" |

---

## File Structure

```
mobile/
├── app/(tabs)/
│   ├── commute.tsx                          — REPLACE (placeholder → full screen)
│   └── settings.tsx                         — ENHANCE (add sections)
├── src/
│   ├── types/
│   │   ├── route.ts                         — NEW (CreateRouteDto, UpdateRouteDto)
│   │   └── notification.ts                  — NEW (NotificationLog, stats types)
│   ├── services/
│   │   ├── route.service.ts                 — NEW (route CRUD API calls)
│   │   └── notification.service.ts          — NEW (history + stats API calls)
│   ├── hooks/
│   │   ├── useRoutes.ts                     — NEW (route state + CRUD actions)
│   │   └── useNotificationHistory.ts        — NEW (history + stats state)
│   └── components/
│       ├── commute/
│       │   ├── RouteCard.tsx                — NEW
│       │   ├── RouteFormModal.tsx            — NEW
│       │   ├── CheckpointRow.tsx             — NEW
│       │   ├── RouteTypeSelector.tsx         — NEW
│       │   ├── EmptyRouteView.tsx            — NEW
│       │   ├── GuestCommuteView.tsx          — NEW
│       │   ├── NotificationStatsSummary.tsx  — NEW
│       │   └── NotificationItem.tsx          — NEW
│       └── settings/
│           ├── QuickLinksSection.tsx         — NEW
│           └── AppInfoSection.tsx            — NEW
```

---

## Task Breakdown

### Phase 1: Types + Services (Foundation)

1. **Create `mobile/src/types/route.ts`** — S — Deps: none
   - `CreateCheckpointDto`, `CreateRouteDto`, `UpdateRouteDto`
   - Re-export existing types from `home.ts`

2. **Create `mobile/src/types/notification.ts`** — S — Deps: none
   - `NotificationLog`, `NotificationHistoryResponse`, `NotificationStatsDto`

3. **Create `mobile/src/services/route.service.ts`** — S — Deps: [1]
   - `fetchRoutes`, `createRoute`, `updateRoute`, `deleteRoute`

4. **Create `mobile/src/services/notification.service.ts`** — S — Deps: [2]
   - `fetchHistory`, `fetchStats`

### Phase 2: Hooks

5. **Create `mobile/src/hooks/useRoutes.ts`** — M — Deps: [3]
   - State management, CRUD actions, optimistic preferred toggle
   - Follow `useAlerts` pattern exactly

6. **Create `mobile/src/hooks/useNotificationHistory.ts`** — M — Deps: [4]
   - Parallel fetch of history + stats
   - Graceful degradation if stats fails

### Phase 3: Route Components

7. **Create `RouteCard.tsx`** — M — Deps: none (pure UI)
   - Name, type badge, checkpoint count, duration, star toggle

8. **Create `RouteTypeSelector.tsx`** — S — Deps: none
   - Horizontal pill selector for morning/evening/custom

9. **Create `CheckpointRow.tsx`** — M — Deps: none
   - Form row with type/transport selectors and duration inputs

10. **Create `RouteFormModal.tsx`** — L — Deps: [8, 9]
    - Full form with checkpoint CRUD, validation, create/edit modes

11. **Create `EmptyRouteView.tsx`** — S — Deps: none
    - Empty state illustration + CTA

12. **Create `GuestCommuteView.tsx`** — S — Deps: none
    - Login prompt (same pattern as `GuestAlertView`)

### Phase 4: Notification Components

13. **Create `NotificationStatsSummary.tsx`** — S — Deps: none
    - Three colored pills with counts

14. **Create `NotificationItem.tsx`** — S — Deps: none
    - Single history row with time, name, type icons, status badge

### Phase 5: Screen Assembly

15. **Replace `commute.tsx`** — L — Deps: [5, 6, 7, 10, 11, 12, 13, 14]
    - Wire up hooks, compose components, handle all states
    - ScrollView with RefreshControl, FAB for add

16. **Create `QuickLinksSection.tsx`** — S — Deps: none
    - Two navigation rows with chevron icons

17. **Create `AppInfoSection.tsx`** — S — Deps: none
    - Version + build info from expo-constants

18. **Enhance `settings.tsx`** — M — Deps: [16, 17]
    - Insert QuickLinksSection and AppInfoSection between profile and logout
    - Preserve all existing functionality

### Phase 6: Verification

19. **TypeScript check** — S — Deps: [15, 18]
    - `npx tsc --noEmit` passes with 0 errors

20. **Manual verification** — M — Deps: [19]
    - All acceptance criteria pass
    - All edge cases handled
    - All states (loading, error, empty, guest, data) render correctly

---

## Open Questions

1. **Checkpoint linked station/bus stop selection**: The form includes `linkedStationId` and `linkedBusStopId` fields. For this cycle, should these be manual text inputs or should we build a station/stop search picker? **Recommendation:** Manual text input for now (matches PWA behavior). Station picker is a Could-have for a future cycle.

2. **Notification history pagination**: The API supports `limit` and `offset`. Should we implement infinite scroll or a "load more" button? **Recommendation:** Fixed limit=20, no pagination for this cycle. Most users won't have more than 20 recent notifications. Add pagination in a future cycle if needed.

3. **Route form complexity**: The full `CreateCheckpointDto` has many optional fields (`linkedStationId`, `linkedBusStopId`, `lineInfo`). Should the form expose all of them? **Recommendation:** Show only: name, checkpointType, transportMode, expectedDurationToNext, expectedWaitTime. The linked IDs are advanced features for a future cycle.

---

## Out of Scope

- **Route map visualization** — Would require a map library (react-native-maps). Significant effort, separate feature.
- **Station/stop search picker** — Requires search UI + backend search endpoint. Separate feature.
- **Push notification OS permissions** — Separate feature involving expo-notifications setup.
- **Notification detail expand view** — Low value; the summary in the list item is sufficient.
- **Account deletion** — Requires backend endpoint + confirmation flow. Separate feature.
- **Theme/dark mode** — Project-wide decision, not per-screen.
- **Commute session tracking** — The "start commute" flow is a separate P2 feature. This cycle only does route CRUD.
- **Route analytics** — Backend has rich analytics endpoints but displaying them is a separate feature.
