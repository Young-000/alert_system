# P1-7: Android Home Screen Widget (Small + Medium)

> Cycle 30 | Branch: `feature/android-widget`

## JTBD

When **rushing out the door for my commute on an Android phone**, I want to **glance at my home screen**, so I can **instantly see the weather, air quality, and next transit arrival without opening the app**.

## Problem

- **Who:** Daily commuters using the 출퇴근 메이트 app on Android (existing active users)
- **Pain:** Every morning the user must open the app, wait for data to load, then read the home screen. This takes 5-10 seconds (high frequency: 2x daily, 5-7 days/week). On rushed mornings this friction causes users to skip checking entirely.
- **Current workaround:** Open the app manually, or check weather and transit apps separately (fragmented experience). iOS users already have widgets (P1-6); Android users have no equivalent.
- **Success metric:** Widget installed by 30%+ of Android users within 2 weeks of release. Same data visible as iOS widget.

---

## Solution

### Overview

Add Android home screen widgets (Small 4x1 and Medium 4x2) to 출퇴근 메이트 using `react-native-android-widget`. This library allows writing Android widgets in React Native JSX -- no Kotlin widget code needed. It provides an Expo config plugin for managed workflow compatibility.

The backend endpoint `GET /widget/data` already exists from P1-6. The existing `widget-sync.service.ts` (currently iOS-only) will be extended to support both platforms. On Android, data is shared between app and widget via `SharedPreferences` (the Android equivalent of iOS `UserDefaults`).

### Technical Approach: `react-native-android-widget`

| Criteria | `react-native-android-widget` | Jetpack Glance | Traditional RemoteViews |
|----------|:-----------------------------:|:--------------:|:----------------------:|
| Widget code language | React Native JSX | Kotlin + Compose | Kotlin + XML |
| Expo managed workflow | Yes (config plugin) | Custom plugin needed | Custom plugin needed |
| Community / maturity | Most active, 1.5K+ stars | Newer, less RN support | Legacy |
| Native Kotlin required | No | Yes | Yes |
| Maintenance burden | Low (JS only) | High (Kotlin) | High (Kotlin + XML) |

**Decision: `react-native-android-widget`**

Justification:
1. Widgets are written in React Native JSX using primitives (`FlexWidget`, `TextWidget`, etc.) -- no native Kotlin code needed for the widget UI.
2. First-class Expo config plugin support -- works with `expo prebuild` and managed workflow.
3. Most mature and widely used library for Android widgets in React Native.
4. Consistent developer experience with the rest of our React Native codebase.

---

## User Flow

```
1. User logs in to app (or is already logged in)
2. App fetches widget data from /widget/data and writes JSON to SharedPreferences
3. User adds widget from Android widget picker (long-press home screen -> Widgets -> "출퇴근 메이트")
4. Widget task handler reads data from SharedPreferences, renders JSX layout
5. Widget auto-updates every 30 minutes (Android minimum) + on app data change
6. User taps widget -> deep link opens app to home tab
7. When user opens app -> app triggers requestWidgetUpdate()
```

**Error states:**
- Not logged in: widget shows "로그인이 필요합니다" with tap-to-open
- No data yet: widget shows placeholder text ("--°", "알림 없음")
- Stale data (>1 hour old): widget shows last data (never shows empty)
- API failure: widget uses cached SharedPreferences data

---

## Scope (MoSCoW)

**Must have:**
- Small widget (4x1): weather temp + emoji, AQI status, next alert time
- Medium widget (4x2): above + feels-like temp, PM10 numeric, transit arrival info
- Expo config plugin setup via `react-native-android-widget`
- Widget tap -> open app (deep link via `commute-mate://` scheme)
- `SharedPreferences` data sharing (app writes JSON, widget reads)
- `widget-sync.service.ts` extended for Android (currently iOS-only)
- `widget-task-handler.tsx` for `WIDGET_ADDED` / `WIDGET_UPDATE` events
- Periodic auto-update via `updatePeriodMillis` (30 min minimum)
- On-demand update via `requestWidgetUpdate()` when app data changes

**Should have:**
- Graceful degradation for missing data fields (show what's available)
- Widget preview image for Android widget picker
- Dark mode support (`WidgetRepresentation` light/dark variants)
- Cache last successful response (show stale data over no data)

**Could have:**
- Configurable widget (user selects which route to show)
- Widget resizing support (`WIDGET_RESIZED` handler)

**Won't have (this cycle):**
- Lock screen widgets (Android 14+ Glance)
- Interactive widget buttons (toggle alerts from widget)
- Large widget size (4x4)
- Background fetch via `WorkManager` (rely on `updatePeriodMillis` + app-triggered updates)

---

## 1. Widget Component Design (React Native JSX)

Widgets are built using `react-native-android-widget` primitives. No hooks allowed; pure functions returning JSX.

### Small Widget (4x1, `targetCellWidth: 4, targetCellHeight: 1`)

```
┌──────────────────────────────────┐
│ ☀️ 3°  미세먼지 좋음 | ⏰ 07:30   │
└──────────────────────────────────┘
```

```tsx
// Simplified structure
<FlexWidget style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
  <TextWidget text={weather.conditionEmoji} />
  <TextWidget text={`${weather.temperature}°`} style={{ fontWeight: 'bold' }} />
  <AqiBadge status={airQuality.status} />
  <TextWidget text="|" />
  <TextWidget text={`⏰ ${nextAlert.time}`} />
</FlexWidget>
```

**Fallback when data is missing:**
- No weather: show "--°"
- No AQI: hide AQI badge
- No next alert: show "알림 없음"

### Medium Widget (4x2, `targetCellWidth: 4, targetCellHeight: 2`)

```
┌──────────────────────────────────┐
│ ☀️ 3°C  체감 -2° | 미세먼지 좋음(35)│
│ ⏰ 07:30 출근 | 🚇 강남역 3분       │
└──────────────────────────────────┘
```

```tsx
// Simplified structure
<FlexWidget style={{ flexDirection: 'column', padding: 12 }}>
  {/* Row 1: Weather + AQI */}
  <FlexWidget style={{ flexDirection: 'row' }}>
    <TextWidget text={`${weather.conditionEmoji} ${weather.temperature}°C`} />
    <TextWidget text={`체감 ${weather.feelsLike}°`} />
    <AqiBadge status={airQuality.status} pm10={airQuality.pm10} />
  </FlexWidget>
  {/* Row 2: Alert + Transit */}
  <FlexWidget style={{ flexDirection: 'row' }}>
    <TextWidget text={`⏰ ${nextAlert.time}`} />
    <TextWidget text={transitLabel} />
  </FlexWidget>
</FlexWidget>
```

**Fallback:** Same strategy as Small, plus "경로를 설정하세요" when no transit data.

### Color Theme

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | `#FFFFFF` | `#1F2937` |
| Primary text | `#111827` | `#F9FAFB` |
| Secondary text | `#6B7280` | `#9CA3AF` |
| AQI Good | `#10B981` bg, `#065F46` text | same |
| AQI Moderate | `#F59E0B` bg, `#92400E` text | same |
| AQI Unhealthy | `#EF4444` bg, `#991B1B` text | same |
| AQI Very Unhealthy | `#7C3AED` bg, `#4C1D95` text | same |

---

## 2. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      REACT NATIVE APP                           │
│                                                                 │
│  useHomeData() ──→ fetchWidgetData() ──→ GET /widget/data       │
│       │                                                         │
│       ▼                                                         │
│  widgetSyncService.syncWidgetData(data)                         │
│       │                                                         │
│       ├─ [iOS] → WidgetDataSync native module → UserDefaults    │
│       │           + WidgetCenter.reloadTimelines()              │
│       │                                                         │
│       └─ [Android] → SharedPreferences (JSON string)            │
│                      + requestWidgetUpdate()                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ANDROID WIDGET PROCESS                        │
│                                                                 │
│  widgetTaskHandler (WIDGET_ADDED / WIDGET_UPDATE)               │
│       │                                                         │
│       ├─→ Read SharedPreferences (cached JSON)                  │
│       │                                                         │
│       ├─→ Parse JSON → WidgetDataResponse                       │
│       │                                                         │
│       └─→ props.renderWidget(<CommuteSmallWidget data={...} />) │
│              or        (<CommuteMediumWidget data={...} />)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### SharedPreferences Data Storage

**Key:** `"widgetData"` in default SharedPreferences (`context.packageName + ".widgetprefs"`)

**Value:** JSON string matching `WidgetDataResponse` type (already defined in `mobile/src/types/home.ts`).

The app writes via an Expo native module (Kotlin). The widget task handler reads it inside the JS runtime when invoked.

### Auth Token on Android

Unlike iOS (where the widget extension is a separate process needing Keychain sharing), Android widgets using `react-native-android-widget` run inside the app's JS context via the task handler. The task handler can read SharedPreferences directly -- **no separate auth token sharing mechanism is needed**. The app stores the widget data JSON in SharedPreferences; the widget reads it. No API call is made from the widget process itself.

This is a key architectural difference from iOS: the Android widget task handler runs as a headless JS task in the app's process, so it has access to the same storage.

---

## 3. Widget Update Strategy

### Periodic Updates

```typescript
// In widget config (app.json plugin config)
{
  updatePeriodMillis: 1800000, // 30 minutes (Android minimum)
}
```

Android enforces a minimum of 30 minutes for `updatePeriodMillis`. When triggered, the system invokes the task handler with `widgetAction: 'WIDGET_UPDATE'`, which reads the latest data from SharedPreferences and re-renders.

### App-Triggered Updates

```typescript
// Called from widget-sync.service.ts on Android
import { requestWidgetUpdate } from 'react-native-android-widget';

requestWidgetUpdate({
  widgetName: 'CommuteSmall',
  renderWidget: () => <CommuteSmallWidget data={cachedData} />,
  widgetNotFound: () => { /* widget not on home screen, no-op */ },
});

requestWidgetUpdate({
  widgetName: 'CommuteMedium',
  renderWidget: () => <CommuteMediumWidget data={cachedData} />,
  widgetNotFound: () => { /* no-op */ },
});
```

### Update Triggers

| Trigger | Mechanism | When |
|---------|-----------|------|
| Periodic | `updatePeriodMillis` (30 min) | System-scheduled |
| App foreground | `requestWidgetUpdate()` in `useHomeData` | Each time user opens app |
| Data change | `requestWidgetUpdate()` after successful fetch | On pull-to-refresh, login, alert CRUD |
| Logout | `requestWidgetUpdate()` with logged-out state | After clearing auth |

---

## 4. Expo Config Plugin Setup

### app.json Changes

```jsonc
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-notifications", { "color": "#3B82F6", "sounds": [] }],
      "@bacons/apple-targets",
      // NEW: Android widget config plugin
      ["react-native-android-widget", {
        "widgets": [
          {
            "name": "CommuteSmall",
            "label": "출퇴근 메이트 (소)",
            "description": "날씨, 미세먼지, 다음 알림을 한눈에",
            "minWidth": "250dp",
            "minHeight": "40dp",
            "targetCellWidth": 4,
            "targetCellHeight": 1,
            "previewImage": "./assets/widget-preview/commute-small.png",
            "updatePeriodMillis": 1800000,
            "resizeMode": "none"
          },
          {
            "name": "CommuteMedium",
            "label": "출퇴근 메이트",
            "description": "날씨, 미세먼지, 알림, 교통 정보를 한눈에",
            "minWidth": "250dp",
            "minHeight": "110dp",
            "targetCellWidth": 4,
            "targetCellHeight": 2,
            "previewImage": "./assets/widget-preview/commute-medium.png",
            "updatePeriodMillis": 1800000,
            "resizeMode": "none"
          }
        ]
      }]
    ]
  }
}
```

### Entry Point Registration (Expo Router)

```typescript
// mobile/index.ts (new file, replaces expo-router/entry as main)
import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
```

Update `package.json`:
```json
{
  "main": "./index.ts"
}
```

---

## 5. Native Module: Android SharedPreferences Bridge

Extend the existing `modules/widget-data-sync/` to support Android alongside iOS.

### Kotlin Implementation

```kotlin
// modules/widget-data-sync/android/WidgetDataSyncModule.kt
class WidgetDataSyncModule : Module() {
  private val prefsName get() = context.packageName + ".widgetprefs"
  private val dataKey = "widgetData"

  override fun definition() = ModuleDefinition {
    Name("WidgetDataSync")

    AsyncFunction("syncWidgetData") { jsonString: String ->
      val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
      prefs.edit().putString(dataKey, jsonString).apply()
    }

    AsyncFunction("clearWidgetData") {
      val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
      prefs.edit().remove(dataKey).apply()
    }

    // Android doesn't need separate auth token sharing (widget runs in app process)
    AsyncFunction("syncAuthToken") { _: String -> /* no-op on Android */ }
    AsyncFunction("clearAuthToken") { /* no-op on Android */ }
  }
}
```

### Module Config Update

```json
{
  "platforms": ["ios", "android"],
  "ios": {
    "modules": ["WidgetDataSyncModule"]
  },
  "android": {
    "modules": ["WidgetDataSyncModule"]
  }
}
```

### Native Module Index Update

The existing `modules/widget-data-sync/index.ts` currently only loads the module on iOS. It must be updated to load on both platforms.

---

## 6. Widget Sync Service Changes

The current `widget-sync.service.ts` no-ops on non-iOS platforms. It must be extended to call both the native SharedPreferences bridge (for data persistence) and `requestWidgetUpdate()` (for immediate widget re-render) on Android.

```typescript
// Pseudocode for the Android path in syncWidgetData:
if (IS_ANDROID) {
  // 1. Persist to SharedPreferences via native module
  await nativeSyncWidgetData(JSON.stringify(data));

  // 2. Trigger immediate widget re-render via react-native-android-widget
  requestWidgetUpdate({
    widgetName: 'CommuteSmall',
    renderWidget: () => <CommuteSmallWidget data={data} />,
    widgetNotFound: () => {},
  });
  requestWidgetUpdate({
    widgetName: 'CommuteMedium',
    renderWidget: () => <CommuteMediumWidget data={data} />,
    widgetNotFound: () => {},
  });
}
```

---

## Acceptance Criteria

### Functional

- [ ] **AC-1**: Given the app is installed on Android, When user long-presses home screen and opens the widget picker, Then "출퇴근 메이트" appears with both Small (4x1) and Medium (4x2) size options.
- [ ] **AC-2**: Given user is logged in, When Small widget is added to home screen, Then it displays: weather emoji + temperature, AQI status label, and next alert time -- matching the data from `GET /widget/data`.
- [ ] **AC-3**: Given user is logged in, When Medium widget is added to home screen, Then it displays: weather + feels-like + AQI with PM10 value, next alert time + type label, and transit arrival info (subway/bus).
- [ ] **AC-4**: Given user taps the widget, When the app opens, Then it navigates to the home tab via `commute-mate://` deep link.
- [ ] **AC-5**: Given user is NOT logged in, When widget renders, Then it shows "로그인이 필요합니다" placeholder with a tap-to-open action.
- [ ] **AC-6**: Given user opens the app and pulls to refresh, When fresh data is fetched, Then SharedPreferences is updated AND `requestWidgetUpdate()` is called, causing the widget to re-render with new data.
- [ ] **AC-7**: Given 30 minutes have elapsed since the last update, When Android triggers `WIDGET_UPDATE`, Then the widget task handler reads latest data from SharedPreferences and re-renders.
- [ ] **AC-8**: Given no data exists in SharedPreferences (first launch), When widget renders, Then it shows graceful placeholder text ("--°", "알림 없음", "경로를 설정하세요") -- never a blank or error widget.

### Technical

- [ ] **AC-9**: TypeScript compilation has 0 errors (`tsc --noEmit` passes).
- [ ] **AC-10**: `npx expo prebuild -p android --clean` succeeds and generates the widget provider in the Android project.
- [ ] **AC-11**: Existing app functionality (home screen, alerts, routes, commute tracking) is unaffected -- all existing tests pass.
- [ ] **AC-12**: `widget-sync.service.ts` works on BOTH iOS and Android -- iOS behavior is unchanged (regression-free).

---

## Task Breakdown

### Setup & Config (S1-S3)

| # | Task | Size | Dependencies |
|---|------|:----:|:------------:|
| S1 | Install `react-native-android-widget`, add Expo plugin config to `app.json` with both widget definitions (CommuteSmall, CommuteMedium) | S | none |
| S2 | Create `mobile/index.ts` entry point, update `package.json` main field, register `widgetTaskHandler` | S | S1 |
| S3 | Create widget preview images (`assets/widget-preview/commute-small.png`, `commute-medium.png`) | S | none |

### Android Native Module (N1-N3)

| # | Task | Size | Dependencies |
|---|------|:----:|:------------:|
| N1 | Create `modules/widget-data-sync/android/WidgetDataSyncModule.kt` -- SharedPreferences read/write (syncWidgetData, clearWidgetData, no-op syncAuthToken/clearAuthToken) | M | none |
| N2 | Update `modules/widget-data-sync/expo-module.config.json` to include Android platform | S | N1 |
| N3 | Update `modules/widget-data-sync/index.ts` to load native module on BOTH iOS and Android (remove iOS-only guard) | S | N2 |

### Widget Components (W1-W4)

| # | Task | Size | Dependencies |
|---|------|:----:|:------------:|
| W1 | Create `mobile/src/widgets/CommuteSmallWidget.tsx` -- Small widget JSX layout using FlexWidget/TextWidget primitives, with data props and fallback states | M | S1 |
| W2 | Create `mobile/src/widgets/CommuteMediumWidget.tsx` -- Medium widget JSX layout with weather, AQI, alert, transit sections and fallback states | M | S1 |
| W3 | Create `mobile/src/widgets/widget-theme.ts` -- color constants, AQI color mapping, shared style helpers | S | none |
| W4 | Create `mobile/src/widgets/widget-task-handler.tsx` -- handle WIDGET_ADDED, WIDGET_UPDATE, WIDGET_CLICK events, read SharedPreferences data, render appropriate widget | M | W1, W2, N1 |

### Service Integration (I1-I2)

| # | Task | Size | Dependencies |
|---|------|:----:|:------------:|
| I1 | Update `widget-sync.service.ts` -- add Android branch: write to SharedPreferences via native module + call `requestWidgetUpdate()` for both widget sizes. Keep iOS path unchanged. | M | N3, W4 |
| I2 | Verify `useHomeData.ts` calls `widgetSyncService.syncWidgetData()` on both platforms (already does, just confirm the no-op guard is removed for Android) | S | I1 |

### Verification (V1-V2)

| # | Task | Size | Dependencies |
|---|------|:----:|:------------:|
| V1 | Run `npx expo prebuild -p android --clean` and verify widget provider is generated in Android project | M | all above |
| V2 | Test on Android emulator/device: widget picker shows both sizes, data displays correctly, tap opens app, auto-update works, logout shows placeholder | L | V1 |

**Total: 13 tasks (5S + 5M + 2L + 1S = ~3-4 hours estimated)**

---

## File List

### Files to CREATE

| File | Purpose |
|------|---------|
| `mobile/index.ts` | App entry point -- registers widget task handler alongside expo-router |
| `mobile/src/widgets/widget-task-handler.tsx` | Handles WIDGET_ADDED/UPDATE/CLICK events, reads SharedPreferences, renders widgets |
| `mobile/src/widgets/CommuteSmallWidget.tsx` | Small (4x1) widget component using FlexWidget/TextWidget |
| `mobile/src/widgets/CommuteMediumWidget.tsx` | Medium (4x2) widget component using FlexWidget/TextWidget |
| `mobile/src/widgets/widget-theme.ts` | Color constants, AQI badge colors, shared styles |
| `mobile/modules/widget-data-sync/android/WidgetDataSyncModule.kt` | Kotlin native module for SharedPreferences read/write |
| `mobile/assets/widget-preview/commute-small.png` | Preview image for widget picker (Small) |
| `mobile/assets/widget-preview/commute-medium.png` | Preview image for widget picker (Medium) |

### Files to MODIFY

| File | Change |
|------|--------|
| `mobile/app.json` | Add `react-native-android-widget` plugin with widget definitions |
| `mobile/package.json` | Add `react-native-android-widget` dependency, change `"main"` to `"./index.ts"` |
| `mobile/modules/widget-data-sync/expo-module.config.json` | Add `"android"` platform with `WidgetDataSyncModule` |
| `mobile/modules/widget-data-sync/index.ts` | Remove iOS-only guard, load native module on both platforms |
| `mobile/src/services/widget-sync.service.ts` | Add Android path: SharedPreferences write + `requestWidgetUpdate()` calls |

---

## Open Questions

1. **Entry point change**: Changing `"main"` from `expo-router/entry` to `./index.ts` (which imports `expo-router/entry` internally) -- does this break any EAS Build configuration or Expo Router behavior? Needs verification with `expo prebuild`.
2. **SharedPreferences access from task handler**: The `react-native-android-widget` task handler runs as a headless JS task. Can it call our Expo native module to read SharedPreferences, or should we use the library's built-in storage helpers? Needs a spike during S2.
3. **Dark mode**: Android system dark mode changes require widget re-render. Should we use `WidgetRepresentation` with separate `light`/`dark` variants, or a single variant that adapts? The library supports both.

---

## Out of Scope

- **Backend changes**: `GET /widget/data` already exists from P1-6. No backend work needed.
- **iOS widget changes**: iOS widget is complete from P1-6. This cycle is Android-only.
- **Configurable widgets**: User selecting which route/alert to show. Future enhancement.
- **WorkManager background sync**: `updatePeriodMillis` + app-triggered updates are sufficient for v1. WorkManager would add complexity with marginal benefit.
- **Large widget (4x4)**: No clear use case. Add based on user feedback.

---

## References

- [react-native-android-widget Documentation](https://saleksovski.github.io/react-native-android-widget/)
- [react-native-android-widget GitHub](https://github.com/sAleksovski/react-native-android-widget)
- [Expo Config Plugins Guide](https://docs.expo.dev/config-plugins/plugins/)
- [Register Widget in Expo](https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-widget-expo)
- [requestWidgetUpdate API](https://saleksovski.github.io/react-native-android-widget/docs/api/request-widget-update)
- [Building Dynamic Home Screen Widgets in React Native (2025)](https://medium.com/@faheem.tfora/building-dynamic-home-screen-widgets-in-react-native-android-ios-complete-2025-dc060feacddc)
- [P1-6 iOS Widget Spec](./ios-widget.md) (reference for parity)
