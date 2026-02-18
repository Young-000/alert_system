# P1-6: iOS WidgetKit (Small + Medium)

> Cycle 29 | Branch: `feature/ios-widget`

## JTBD

When **rushing out the door for my commute**, I want to **glance at my home screen or lock screen**, so I can **instantly see the weather, air quality, and next transit arrival without opening the app**.

## Problem

- **Who:** Daily commuters using the 출퇴근 메이트 app on iOS (existing active users)
- **Pain:** Every morning the user must open the app, wait for data to load, then read the home screen. This takes 5-10 seconds (high frequency: 2x daily, 5-7 days/week). On rushed mornings this friction causes users to skip checking entirely.
- **Current workaround:** Open the app manually, or check weather and transit apps separately (fragmented experience)
- **Success metric:** Widget installed by 40%+ of iOS users within 2 weeks of release. Home screen data visible in under 1 second (vs. 3-5 second app open).

---

## Solution

### Overview

Add iOS WidgetKit Small (2x2) and Medium (4x2) home screen widgets to 출퇴근 메이트. The widgets display a consolidated commute briefing (weather, air quality, next alert time, and transit arrival info) that updates automatically throughout the day.

A single dedicated backend endpoint (`GET /widget/data`) aggregates all required data in one call, minimizing battery and network usage. The app writes widget data to a shared App Group (`group.com.commutemate.app`) via `UserDefaults`, and the native SwiftUI widget reads it through a `TimelineProvider`.

### Technical Approach Decision: `@bacons/apple-targets` (expo-apple-targets)

Three options were evaluated:

| Criteria | `@bacons/apple-targets` | `react-native-widget-extension` | Custom config plugin |
|----------|:-----------------------:|:-------------------------------:|:--------------------:|
| Expo managed workflow | Yes (SDK 53+) | Yes | Yes |
| Maintenance & community | Active (v3.0.5, Oct 2025) | Moderate | None (DIY) |
| App Groups auto-config | Yes (mirrors app.json) | Manual | Manual |
| WidgetKit target generation | Automatic via `npx create-target` | Automatic | Manual pbxproj |
| CNG (Continuous Native Gen) | Full support | Partial | Manual |
| SwiftUI development in Xcode | First-class (`expo:targets` folder) | Supported | Supported |
| Evan Bacon (Expo core team) | Author | Community | N/A |
| Official Expo blog endorsement | [Yes](https://expo.dev/blog/how-to-implement-ios-widgets-in-expo-apps) | No | No |

**Decision: `@bacons/apple-targets` v3.x**

Justification:
1. **Best CNG integration** -- targets live in `/targets` directory outside `/ios`, surviving `expo prebuild --clean`. This is the correct pattern for Expo managed workflow.
2. **Actively maintained by Expo core team member** (Evan Bacon), with Expo SDK 53+ compatibility confirmed.
3. **App Groups entitlements are auto-mirrored** from `app.json`, reducing manual configuration errors.
4. **Official Expo blog recommends this approach** for WidgetKit integration.
5. **Not `expo-widgets` (SDK 55)** because our project is locked to SDK 54. `expo-widgets` also uses `@expo/ui` components which are less mature than direct SwiftUI for complex layouts.

---

## User Flow

```
1. User logs in to app (or is already logged in)
2. App fetches widget data from /widget/data and writes to App Group UserDefaults
3. User adds widget from iOS widget gallery (long-press home screen -> "+" -> search "출퇴근 메이트")
4. Widget reads data from UserDefaults, renders SwiftUI layout
5. Timeline Provider refreshes data every 15 minutes during commute hours (06:00-09:00, 17:00-20:00), hourly otherwise
6. User taps widget -> deep link opens app to relevant tab
7. When user opens app -> app refreshes widget data proactively
```

**Error states:**
- Not logged in -> widget shows "로그인이 필요합니다" with tap-to-open
- No data yet -> widget shows placeholder/skeleton
- Stale data (>1 hour old) -> widget shows last data with "업데이트 중..." indicator
- API failure -> widget shows cached data (never shows empty)

---

## Scope (MoSCoW)

**Must have:**
- Small widget (2x2): weather temp + emoji, AQI status, next alert time
- Medium widget (4x2): above + transit arrival info (subway/bus), expanded AQI
- Backend `GET /widget/data` aggregated endpoint (JWT auth)
- App Groups data sharing (`group.com.commutemate.app`)
- Expo config plugin setup via `@bacons/apple-targets`
- Widget tap -> open app (deep link)
- Timeline-based automatic refresh
- Expo native module to write data from RN to App Group UserDefaults

**Should have:**
- Smart refresh intervals (more frequent during commute hours)
- Graceful degradation for missing data (show what's available)
- Widget placeholder/snapshot for widget gallery preview
- Cache last successful response (show stale data > no data)

**Could have:**
- Lock screen widgets (iOS 16+ accessoryRectangular)
- Widget configuration intent (select which route/alert to show)
- Animated transitions between timeline entries

**Won't have (this cycle):**
- Android widgets (Glance / AppWidgetProvider)
- Live Activities / Dynamic Island
- Interactive widget buttons (iOS 17+ App Intents)
- Large (4x4) widget size
- Widget written in React Native via `expo-widgets` (requires SDK 55)

---

## 1. Backend: `/widget/data` Endpoint

### Controller & Service

A new `WidgetController` and `WidgetDataService` that aggregates data from existing services.

### Request

```
GET /widget/data?lat={latitude}&lng={longitude}
Authorization: Bearer {jwt_token}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|:--------:|---------|-------------|
| `lat` | number | No | 37.5665 (Seoul) | Latitude for weather/AQI |
| `lng` | number | No | 126.9780 (Seoul) | Longitude for weather/AQI |

### Response Schema

```typescript
// HTTP 200 OK
type WidgetDataResponse = {
  weather: {
    temperature: number;       // e.g., 3
    condition: string;         // e.g., "Clear"
    conditionEmoji: string;    // e.g., "☀️"
    conditionKr: string;       // e.g., "맑음"
    feelsLike?: number;        // e.g., -2
    maxTemp?: number;          // today's high
    minTemp?: number;          // today's low
  } | null;

  airQuality: {
    pm10: number;              // e.g., 35
    pm25: number;              // e.g., 18
    status: string;            // e.g., "좋음"
    statusLevel: 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy';
  } | null;

  nextAlert: {
    time: string;              // e.g., "07:30" or "내일 07:30"
    label: string;             // e.g., "날씨 + 교통 알림"
    alertTypes: string[];      // e.g., ["weather", "subway"]
  } | null;

  transit: {
    subway: {
      stationName: string;     // e.g., "강남역"
      lineInfo: string;        // e.g., "2호선"
      arrivalMinutes: number;  // e.g., 3
      destination: string;     // e.g., "삼성행"
    } | null;
    bus: {
      stopName: string;        // e.g., "강남역"
      routeName: string;       // e.g., "146번"
      arrivalMinutes: number;  // e.g., 5
      remainingStops: number;  // e.g., 3
    } | null;
  };

  updatedAt: string;           // ISO 8601, e.g., "2026-02-19T07:15:00+09:00"
};
```

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ "message": "Unauthorized" }` | Missing/invalid JWT |
| 500 | `{ "message": "Internal server error" }` | Service failure |

### Backend Implementation Notes

- Uses `Promise.allSettled` to fetch weather, air quality, alerts, and routes/transit in parallel. Individual failures return `null` for that field (never fail the entire response).
- Transit data is derived from the user's **preferred route** (first `isPreferred: true` route). Falls back to the first route with subway/bus checkpoints.
- The `nextAlert` calculation reuses the same logic as `computeNextAlert()` in the mobile app, ported to the backend.
- Endpoint is **NOT** `@Public()` -- it requires JWT authentication. The widget's `TimelineProvider` fetches this via the token stored in the shared Keychain Access Group.

### DTO Definition

```typescript
// backend/src/application/dto/widget-data.dto.ts
export class WidgetDataQueryDto {
  lat?: number;
  lng?: number;
}

export class WidgetDataResponseDto {
  weather: WidgetWeatherDto | null;
  airQuality: WidgetAirQualityDto | null;
  nextAlert: WidgetNextAlertDto | null;
  transit: WidgetTransitDto;
  updatedAt: string;
}
```

---

## 2. Widget Design

### Small Widget (systemSmall, 2x2)

```
┌──────────────────────┐
│  ☀️  3°   미세먼지 좋음 │
│                      │
│  ⏰ 다음 알림 07:30    │
│  🚇 강남역 3분         │
└──────────────────────┘
```

**Layout rules:**
- Line 1: Weather emoji + temperature (bold, large) + AQI badge (pill shape, colored)
- Line 2: (spacer)
- Line 3: Clock icon + "다음 알림" label + time (bold)
- Line 4: Transit icon + station/stop name + arrival minutes

**Fallback when data is missing:**
- No weather: show "--°" with gray placeholder
- No AQI: hide AQI badge entirely
- No next alert: show "알림 없음"
- No transit: show "경로를 설정하세요"

### Medium Widget (systemMedium, 4x2)

```
┌──────────────────────────────────────┐
│  ☀️  3°C  체감 -2°   미세먼지 좋음 (35) │
│                                      │
│  ⏰  다음 알림: 07:30 (출근)            │
│  🚇 강남역 2호선 3분  /  🚌 146번 5분   │
└──────────────────────────────────────┘
```

**Layout rules:**
- Line 1: Weather emoji + temp + feels-like + AQI badge with PM10 numeric value
- Line 2: (spacer)
- Line 3: Next alert time + alert type label (출근/퇴근)
- Line 4: Subway arrival + Bus arrival side by side (divider)

**Fallback:** Same strategy as Small, but more room for descriptive text (e.g., "경로 탭에서 출퇴근 경로를 설정하세요").

### SwiftUI Code Structure

```
targets/widget/
  Sources/
    CommuteWidget.swift           -- @main WidgetBundle
    CommuteWidgetSmall.swift      -- Small widget view
    CommuteWidgetMedium.swift     -- Medium widget view
    CommuteTimelineProvider.swift -- TimelineProvider (data fetch + timeline)
    WidgetData.swift              -- Codable model (matches UserDefaults JSON)
    SharedDataReader.swift        -- UserDefaults App Group reader
    Theme.swift                   -- Colors, fonts, spacing constants
  Assets.xcassets/
    AccentColor.colorset/
    WidgetBackground.colorset/
  expo-target.config.js           -- Target configuration
```

### Color Theme

| Element | Light Mode | Purpose |
|---------|-----------|---------|
| Background | System white | Standard widget bg |
| Primary text | #111827 (gray-900) | Temperature, time |
| Secondary text | #6B7280 (gray-500) | Labels |
| AQI Good | #10B981 bg, #065F46 text | PM10 0-30 |
| AQI Moderate | #F59E0B bg, #92400E text | PM10 31-80 |
| AQI Unhealthy | #EF4444 bg, #991B1B text | PM10 81-150 |
| AQI Very Unhealthy | #7C3AED bg, #4C1D95 text | PM10 151+ |

---

## 3. Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT NATIVE APP                           │
│                                                                     │
│  useHomeData() ──→ home.service.ts ──→ API calls                   │
│       │                                                             │
│       ▼                                                             │
│  WidgetDataSync module                                              │
│       │                                                             │
│       ├─→ expo-secure-store (JWT token)                             │
│       │      │                                                      │
│       │      ▼                                                      │
│       │   Keychain Access Group (group.com.commutemate.app)         │
│       │      │                                                      │
│       │      ▼ (shared token)                                       │
│       │                                                             │
│       └─→ UserDefaults(suiteName: "group.com.commutemate.app")     │
│              │                                                      │
│              ▼ (JSON widget data)                                   │
│                                                                     │
│  WidgetCenter.shared.reloadTimelines(ofKind: "CommuteWidget")      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WIDGETKIT EXTENSION                            │
│                                                                     │
│  CommuteTimelineProvider                                            │
│       │                                                             │
│       ├─→ Read UserDefaults (cached data)                           │
│       │                                                             │
│       ├─→ Read JWT from Keychain Access Group                       │
│       │      │                                                      │
│       │      ▼                                                      │
│       ├─→ GET /widget/data (with JWT auth)                          │
│       │      │                                                      │
│       │      ▼                                                      │
│       ├─→ Parse response → WidgetData                               │
│       │      │                                                      │
│       │      ▼                                                      │
│       ├─→ Write back to UserDefaults (update cache)                 │
│       │                                                             │
│       └─→ Return Timeline<WidgetEntry>                              │
│              │                                                      │
│              ▼                                                      │
│       CommuteWidgetSmall / CommuteWidgetMedium (SwiftUI views)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Auth Token Sharing

**Problem:** The widget extension is a separate process and cannot access the app's Expo SecureStore directly.

**Solution:** Keychain Access Group sharing.

1. Configure `kSecAttrAccessGroup` in the app's entitlements with the App Group ID.
2. Create a native module (`WidgetAuthBridge`) that copies the JWT token from Expo SecureStore to the shared Keychain Access Group on every login and token refresh.
3. The widget's `TimelineProvider` reads the JWT from the shared Keychain Access Group using native `Security.framework`.
4. On logout, the bridge clears the shared Keychain entry.

```swift
// In TimelineProvider
func getToken() -> String? {
  let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccessGroup as String: "group.com.commutemate.app",
    kSecAttrAccount as String: "widgetAccessToken",
    kSecReturnData as String: true,
  ]
  var result: AnyObject?
  SecItemCopyMatching(query as CFDictionary, &result)
  guard let data = result as? Data else { return nil }
  return String(data: data, encoding: .utf8)
}
```

### UserDefaults Data Format

```swift
// Key: "widgetData" in UserDefaults(suiteName: "group.com.commutemate.app")
struct WidgetData: Codable {
  let weather: WidgetWeather?
  let airQuality: WidgetAirQuality?
  let nextAlert: WidgetNextAlert?
  let transit: WidgetTransit
  let updatedAt: String  // ISO 8601
}
```

The RN app writes this as a JSON string. The widget decodes it with `JSONDecoder`.

---

## 4. Widget Timeline Strategy

### Refresh Policy

```swift
func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
  // 1. Try network fetch (GET /widget/data)
  // 2. On success: create entries for next 60 minutes (4 entries, 15 min apart)
  // 3. On failure: use cached UserDefaults data, single entry
  // 4. Set reload policy based on time of day

  let now = Date()
  let hour = Calendar.current.component(.hour, from: now)
  let isCommuteHour = (6...9).contains(hour) || (17...20).contains(hour)

  let refreshInterval: TimeInterval = isCommuteHour
    ? 15 * 60   // 15 minutes during commute hours
    : 60 * 60   // 1 hour otherwise

  let nextUpdate = now.addingTimeInterval(refreshInterval)
  let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
  completion(timeline)
}
```

### Refresh Triggers

| Trigger | Mechanism | Frequency |
|---------|-----------|-----------|
| Scheduled timeline | `.after(Date)` policy | Every 15 min (commute) / 60 min (other) |
| App foreground | `WidgetCenter.shared.reloadTimelines()` | Each time user opens app |
| Data change | Called after successful home data fetch | On pull-to-refresh, login, alert CRUD |
| Background fetch | iOS Background App Refresh | When OS grants budget |

### Battery Optimization

1. **Single API call**: `/widget/data` returns everything in one request (vs. 4 separate calls).
2. **Smart intervals**: 15-min refresh only during commute windows (6-9 AM, 5-8 PM). 1-hour refresh otherwise. No refresh 11 PM - 5 AM.
3. **Cached fallback**: If network fails, display last cached data. Never make a network call just to show the same data.
4. **Pre-populated timeline**: Generate 4 entries per timeline (15 min apart) so the system doesn't need to wake the widget extension for every visual update.
5. **Respect system budget**: iOS limits widgets to ~40-70 refreshes/day. Our strategy targets ~30 (16 during commute hours + 14 non-commute) well within budget.

### Night Mode (11 PM - 5 AM)

During night hours, the timeline uses `.never` policy. Refresh only resumes when:
- The app is opened (explicit `reloadTimelines` call)
- The first commute-hour window begins at 6 AM (last timeline entry before midnight schedules `.after(6AM)`)

---

## 5. Expo Config Plugin Setup

### app.json Changes

```jsonc
{
  "expo": {
    // ... existing config ...
    "ios": {
      "bundleIdentifier": "com.commutemate.app",
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.commutemate.app"
        ]
      }
    },
    "plugins": [
      // ... existing plugins ...
      "@bacons/apple-targets"
    ]
  }
}
```

### targets/widget/expo-target.config.js

```javascript
/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'CommuteWidget',
  bundleIdentifier: '.widget',  // resolves to com.commutemate.app.widget
  deploymentTarget: '16.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': [
      'group.com.commutemate.app',
    ],
    'keychain-access-groups': [
      '$(AppIdentifierPrefix)group.com.commutemate.app',
    ],
  },
};
```

### Native Module: WidgetDataSync

A custom Expo Module that bridges RN and the native widget data layer.

```typescript
// mobile/modules/widget-data-sync/index.ts (Expo Module API)
export function syncWidgetData(data: WidgetDataResponse): Promise<void>;
export function clearWidgetData(): Promise<void>;
export function syncAuthToken(token: string): Promise<void>;
export function clearAuthToken(): Promise<void>;
```

Native implementation writes to:
- `UserDefaults(suiteName: "group.com.commutemate.app")` for widget display data
- Keychain with `kSecAttrAccessGroup: "group.com.commutemate.app"` for JWT token

---

## 6. Acceptance Criteria

### Functional

- [ ] **AC-1**: Given the app is installed, When user long-presses home screen and searches "출퇴근", Then "출퇴근 메이트" widget appears in the widget gallery with both Small and Medium size options.
- [ ] **AC-2**: Given user is logged in, When Small widget is added to home screen, Then it displays: weather emoji + temperature, AQI status label, next alert time, and first transit arrival (subway or bus name + minutes).
- [ ] **AC-3**: Given user is logged in, When Medium widget is added to home screen, Then it displays: weather emoji + temperature + feels-like + AQI with PM10 value, next alert time + type label, subway arrival info AND bus arrival info.
- [ ] **AC-4**: Given user taps the widget, When the app opens, Then it navigates to the home tab.
- [ ] **AC-5**: Given user is logged in and has active alerts, When `GET /widget/data` is called with valid JWT, Then it returns a 200 response with weather, airQuality, nextAlert, and transit data matching the response schema.
- [ ] **AC-6**: Given user is NOT logged in, When widget attempts to render, Then it shows "로그인이 필요합니다" placeholder with a tap-to-open action.
- [ ] **AC-7**: Given widget data was last fetched at 07:00 during a commute window, When 15 minutes elapse, Then the Timeline Provider triggers a refresh and updates the displayed data.
- [ ] **AC-8**: Given the API returns an error, When the Timeline Provider runs, Then the widget shows the last cached data from UserDefaults (never shows a blank/error widget).
- [ ] **AC-9**: Given the user opens the app and pulls to refresh, When fresh data is fetched, Then the widget data in UserDefaults is updated and `reloadTimelines` is called.
- [ ] **AC-10**: Given the user logs out, When the auth token is cleared, Then the shared Keychain token is also cleared, and the widget shows the "로그인이 필요합니다" state.

### Technical

- [ ] **AC-11**: TypeScript compilation has 0 errors (`tsc --noEmit` passes).
- [ ] **AC-12**: `npx expo prebuild -p ios --clean` succeeds and generates the WidgetKit extension target in the Xcode project.
- [ ] **AC-13**: Existing app functionality (home screen, alerts, routes, commute tracking) is unaffected (all existing tests pass).
- [ ] **AC-14**: Backend unit tests for `WidgetDataService` cover: success (all data), partial failure (some services down), and auth failure cases.
- [ ] **AC-15**: Widget respects iOS system budget (targets fewer than 40 refreshes/day).

---

## 7. Task Breakdown

### Backend (NestJS)

| # | Task | Size | Dependencies |
|---|------|:----:|:------------:|
| B1 | Create `WidgetDataQueryDto` and `WidgetDataResponseDto` in `backend/src/application/dto/widget-data.dto.ts` | S | none |
| B2 | Create `WidgetDataService` in `backend/src/application/services/widget-data.service.ts` -- inject weather, AQI, alert, route, subway, bus services. Implement `getData(userId, lat, lng)` using `Promise.allSettled` | L | B1 |
| B3 | Port `computeNextAlert()` logic to backend in `WidgetDataService` (or import shared util) | S | B2 |
| B4 | Create `WidgetController` at `backend/src/presentation/controllers/widget.controller.ts` with `GET /widget/data` endpoint (JWT-protected) | M | B2 |
| B5 | Create `WidgetModule` at `backend/src/presentation/modules/widget.module.ts`, register in `AppModule` | S | B4 |
| B6 | Write unit tests for `WidgetDataService` (all-success, partial-failure, no-routes, no-alerts cases) | M | B2 |
| B7 | Write integration test for `GET /widget/data` (auth, response schema) | M | B4, B5 |

### Mobile -- Expo Config & Native Module

| # | Task | Size | Dependencies |
|---|------|:----:|:------------:|
| M1 | Install `@bacons/apple-targets` and update `app.json` (plugins, App Group entitlements) | S | none |
| M2 | Run `npx create-target widget` to scaffold `/targets/widget/` directory | S | M1 |
| M3 | Configure `targets/widget/expo-target.config.js` (App Group, Keychain Access Group, frameworks) | S | M2 |
| M4 | Create Expo native module `modules/widget-data-sync/` with Swift implementation for UserDefaults + Keychain writes | L | M1 |
| M5 | Create TypeScript wrapper `mobile/src/services/widget-sync.service.ts` calling the native module | S | M4 |
| M6 | Integrate `widgetSync.syncWidgetData()` into `useHomeData` hook (after successful data fetch) | M | M5 |
| M7 | Integrate `widgetSync.syncAuthToken()` into `tokenService.saveAuthData()` and `widgetSync.clearAuthToken()` into `tokenService.clearAll()` | M | M5 |
| M8 | Add `fetchWidgetData()` to `mobile/src/services/home.service.ts` for the new `/widget/data` endpoint | S | B4 |

### Mobile -- SwiftUI Widget

| # | Task | Size | Dependencies |
|---|------|:----:|:------------:|
| W1 | Define `WidgetData.swift` Codable model (matching UserDefaults JSON schema) | S | M3 |
| W2 | Implement `SharedDataReader.swift` (read UserDefaults + Keychain token) | M | W1 |
| W3 | Implement `CommuteTimelineProvider.swift` (network fetch, cache fallback, smart intervals) | L | W2, B4 |
| W4 | Implement `CommuteWidgetSmall.swift` (SwiftUI layout for systemSmall) | M | W1 |
| W5 | Implement `CommuteWidgetMedium.swift` (SwiftUI layout for systemMedium) | M | W1 |
| W6 | Implement `Theme.swift` (colors, fonts, AQI color mapping) | S | none |
| W7 | Create `CommuteWidget.swift` (@main WidgetBundle registering both sizes) | S | W4, W5 |
| W8 | Add widget preview snapshots for Xcode development | S | W4, W5 |
| W9 | Verify `npx expo prebuild -p ios --clean` succeeds with widget target | M | all above |
| W10 | Test on physical device (widget gallery, data display, tap-to-open, refresh) | L | W9 |

---

## 8. File List

### Files to CREATE

| File | Purpose |
|------|---------|
| `backend/src/application/dto/widget-data.dto.ts` | Request/response DTOs for widget endpoint |
| `backend/src/application/services/widget-data.service.ts` | Aggregation service (weather + AQI + alerts + transit) |
| `backend/src/presentation/controllers/widget.controller.ts` | `GET /widget/data` endpoint |
| `backend/src/presentation/modules/widget.module.ts` | NestJS module for widget feature |
| `backend/src/application/services/widget-data.service.spec.ts` | Unit tests for WidgetDataService |
| `targets/widget/expo-target.config.js` | Apple target configuration |
| `targets/widget/Sources/CommuteWidget.swift` | @main WidgetBundle entry |
| `targets/widget/Sources/CommuteWidgetSmall.swift` | Small widget SwiftUI view |
| `targets/widget/Sources/CommuteWidgetMedium.swift` | Medium widget SwiftUI view |
| `targets/widget/Sources/CommuteTimelineProvider.swift` | Timeline data provider |
| `targets/widget/Sources/WidgetData.swift` | Codable data model |
| `targets/widget/Sources/SharedDataReader.swift` | App Group UserDefaults + Keychain reader |
| `targets/widget/Sources/Theme.swift` | Design constants (colors, fonts) |
| `targets/widget/Assets.xcassets/` | Widget assets (colors, optional images) |
| `mobile/modules/widget-data-sync/index.ts` | Expo module TS API |
| `mobile/modules/widget-data-sync/ios/WidgetDataSyncModule.swift` | Native Swift implementation |
| `mobile/modules/widget-data-sync/expo-module.config.json` | Expo module config |
| `mobile/src/services/widget-sync.service.ts` | TS wrapper for widget data sync |

### Files to MODIFY

| File | Change |
|------|--------|
| `mobile/app.json` | Add `@bacons/apple-targets` plugin, add `ios.entitlements` with App Groups |
| `mobile/package.json` | Add `@bacons/apple-targets` dependency |
| `mobile/src/hooks/useHomeData.ts` | Call `widgetSync.syncWidgetData()` after successful data fetch |
| `mobile/src/services/home.service.ts` | Add `fetchWidgetData()` function |
| `mobile/src/services/token.service.ts` | Call `widgetSync.syncAuthToken()` on save, `clearAuthToken()` on clear |
| `mobile/src/types/home.ts` | Add `WidgetDataResponse` type |
| `backend/src/presentation/app.module.ts` | Import `WidgetModule` |

---

## Open Questions

1. **Apple Developer Account setup**: Is the App Group capability already configured in the Apple Developer portal for `com.commutemate.app`? If not, we need `App Manager` permission to enable it.
2. **EAS Build**: Does the current EAS Build profile support custom native modules? May need `eas build --profile development` with a dev client.
3. **Token expiration**: If the JWT expires while the widget is running, should the widget show stale data with a "토큰 만료" indicator, or silently show cached data?
4. **Default location**: Should the widget use the device's last known location (via App Group), or always use the default Seoul coordinates? Using device location requires `CLLocationManager` access from the widget extension (limited).

---

## Out of Scope

- **Android widgets**: Different API surface (Glance/AppWidgetProvider), separate cycle.
- **Live Activities / Dynamic Island**: Requires ActivityKit, separate feature.
- **Interactive widgets (iOS 17 App Intents)**: Toggle alert on/off from widget. Future enhancement.
- **Large widget (systemLarge)**: No clear use case beyond Medium. Add if user feedback requests it.
- **Configurable widgets (WidgetConfigurationIntent)**: Let user pick which route/alert to display. Future enhancement after v1 validates the concept.
- **`expo-widgets` migration**: When the project upgrades to Expo SDK 55, evaluate migrating from `@bacons/apple-targets` to `expo-widgets` for a no-Swift approach.

---

## References

- [Expo Blog: How to implement iOS widgets in Expo apps](https://expo.dev/blog/how-to-implement-ios-widgets-in-expo-apps)
- [EvanBacon/expo-apple-targets GitHub](https://github.com/EvanBacon/expo-apple-targets)
- [@bacons/apple-targets README](https://github.com/EvanBacon/expo-apple-targets/blob/main/packages/apple-targets/README.md)
- [Apple: Keeping a widget up to date](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date)
- [Apple: TimelineReloadPolicy](https://developer.apple.com/documentation/widgetkit/timelinereloadpolicy)
- [react-native-widget-extension GitHub](https://github.com/bndkt/react-native-widget-extension)
- [Expo Widgets SDK 55 Docs](https://docs.expo.dev/versions/v55.0.0/sdk/widgets/)
- [Building Interactive Widgets in Expo-Managed React Native Apps](https://www.peterarontoth.com/posts/interactive-widgets-in-expo-managed-workflows)
