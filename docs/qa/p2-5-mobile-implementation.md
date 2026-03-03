# P2-5: iOS Live Activity — Mobile Implementation Summary

> Date: 2026-02-20 | Branch: `feature/ios-live-activity`

---

## Completed Tasks

### Phase A: Swift Native Code (targets/widget/Sources/)

| Task | File | Status | Notes |
|------|------|:------:|-------|
| SW-1 | `CommuteActivityAttributes.swift` | Done | ActivityAttributes + ContentState with all required fields. LiveActivitySharedData struct for App Group sharing. |
| SW-2 | `CommuteActivityView.swift` | Done | Lock Screen UI with 5 states: preparing (blue), departureSoon (orange), departureNow (red), inTransit (green), arrived (green). Date-based countdown timer, route progress bar, transit info, traffic delay badge. |
| SW-3 | `CommuteDynamicIsland.swift` | Done | CommuteLiveActivity widget with Compact (mode icon + timer), Expanded (full departure/arrival info + transit), Minimal (minutes only). Commute/return mode themes. |
| SW-4 | `LiveActivityManager.swift` | Done | Static helper with startActivity, updateActivity, endActivity, endAllActivities, getActiveActivity, isSupported. App Group shared data for widget extension. @available(iOS 16.1, *) checks throughout. |
| SW-5 | `CommuteWidget.swift` (modified) | Done | Added `CommuteLiveActivity()` to WidgetBundle with iOS 16.1 availability check. |
| SW-6 | `expo-target.config.js` (modified) | Done | deploymentTarget: "16.1", frameworks: added "ActivityKit", infoPlist: NSSupportsLiveActivities = true. |

### Phase B: Expo Native Module (modules/live-activity/)

| Task | File | Status | Notes |
|------|------|:------:|-------|
| NM-1 | `ios/LiveActivityModule.swift` | Done | ExpoModulesCore Module bridging all LiveActivityManager methods. Parses ISO 8601 dates, converts NSDictionary params to Swift types. Error handling with LiveActivityError. |
| NM-2 | `index.ts` | Done | TypeScript wrapper with Platform.OS === 'ios' check. All methods return null/false on non-iOS. Uses requireNativeModule for module loading with try/catch fallback. |
| NM-3 | Push token observer | Done | In LiveActivityModule.swift: observes Activity.pushTokenUpdates async sequence. Emits "onPushTokenUpdate" events to RN. In index.ts: addPushTokenListener using NativeEventEmitter. |
| - | `expo-module.config.json` | Done | iOS-only module configuration. |

### Phase C: React Native Layer (src/)

| Task | File | Status | Notes |
|------|------|:------:|-------|
| FE-1 | `types/live-activity.ts` | Done | All types: LiveActivityStatus, LiveActivityMode, LiveActivityInfo, StartLiveActivityParams, UpdateLiveActivityParams, RegisterLiveActivityDto, RegisterLiveActivityResponse, LiveActivityState. |
| FE-2 | `services/live-activity.service.ts` | Done | Wrapper around native module + server API calls (registerPushToken, deregisterToken). Follows existing service pattern (apiClient). |
| FE-3 | `hooks/useLiveActivity.ts` | Done | Full lifecycle management: device support check, existing activity restoration, start/update/end methods, push token registration with server, push token observer subscription. |
| FE-4 | `hooks/useSmartDepartureToday.ts` (modified) | Done | Auto-start Live Activity when minutesUntilDeparture <= 60. Auto-update with latest snapshot data every minute. Auto-end when departure time passed by 30+ minutes. Status determination (preparing/departureSoon/departureNow). |
| FE-5 | `hooks/useGeofence.ts` (modified) | Done | Geofence exit: updates Live Activity status to "inTransit". Geofence enter at destination: ends Live Activity. Added onGeofenceEvent callback registration. |

---

## Verification

- **TypeScript**: `npx tsc --noEmit` passes with 0 errors.
- **Swift**: Code follows existing widget patterns (Theme, SharedDataReader, WidgetData). @available checks prevent crashes on iOS < 16.1.
- **No regressions**: Existing WidgetKit widgets (Small/Medium) and hooks (useGeofence, useSmartDepartureToday) maintain backward compatibility.

---

## Architecture Decisions

1. **Static LiveActivityManager**: Used `enum` (caseless) for namespace pattern, matching Swift best practices for utility classes.

2. **Date-based countdown**: Uses ActivityKit's native `Text(timerInterval:)` for battery-efficient countdown without separate timers.

3. **Push token flow**: Activity start -> get push token -> register with server. Token observer handles token rotation automatically.

4. **Graceful degradation**: Every method checks `@available(iOS 16.1, *)` or `Platform.OS === 'ios'`. Non-iOS platforms get no-op returns.

5. **Single activity constraint**: `startActivity` always ends existing activities first to prevent duplicate Live Activities.

6. **Module loading**: Uses `requireNativeModule` with try/catch to avoid crashes when running in Expo Go without native build.

---

## Files Created

- `/mobile/targets/widget/Sources/CommuteActivityAttributes.swift`
- `/mobile/targets/widget/Sources/CommuteActivityView.swift`
- `/mobile/targets/widget/Sources/CommuteDynamicIsland.swift`
- `/mobile/targets/widget/Sources/LiveActivityManager.swift`
- `/mobile/modules/live-activity/ios/LiveActivityModule.swift`
- `/mobile/modules/live-activity/expo-module.config.json`
- `/mobile/modules/live-activity/index.ts`
- `/mobile/src/types/live-activity.ts`
- `/mobile/src/services/live-activity.service.ts`
- `/mobile/src/hooks/useLiveActivity.ts`

## Files Modified

- `/mobile/targets/widget/Sources/CommuteWidget.swift` — Added CommuteLiveActivity to WidgetBundle
- `/mobile/targets/widget/expo-target.config.js` — ActivityKit framework, deploymentTarget 16.1, NSSupportsLiveActivities
- `/mobile/src/hooks/useSmartDepartureToday.ts` — Live Activity auto-start/update/end integration
- `/mobile/src/hooks/useGeofence.ts` — Live Activity state transitions on geofence events

---

## Remaining (Not in scope for this task)

- **Backend (BE-1~BE-7)**: Server-side push token storage, APNs push-to-update service, controller/module. Assigned to BE Developer.
- **Xcode build verification**: Requires native build via `eas build` or local Xcode.
- **Dynamic Island real-device testing**: Simulator supports Lock Screen preview only.
