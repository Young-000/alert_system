# P2-5: iOS Live Activity (출퇴근 실시간 표시)

> Spec v1.0 | 2026-02-20 | Cycle 36 | Branch: `feature/ios-live-activity`

---

## JTBD

When **스마트 출발 카운트다운이 시작되어 출근 준비를 하면서 남은 시간을 확인하고 싶을 때**,
I want to **잠금 화면이나 Dynamic Island에서 앱을 열지 않고도 출발까지 남은 시간과 다음 체크포인트 정보를 실시간으로 볼 수 있기를**,
so I can **화면을 켜기만 하면 즉시 출발 타이밍을 파악하고, 준비 속도를 조절하여 정시에 출발할 수 있다**.

---

## Problem

- **Who:** 이미 스마트 출발 알림(P2-2)을 사용 중인 iOS 사용자. 매일 출근 준비 중에 "몇 분 남았지?"를 확인하려고 앱을 반복해서 여는 사람.
- **Pain:** 스마트 출발 카운트다운을 확인하려면 매번 앱을 열어야 한다. 준비 중(세수, 옷 입기, 아침 식사)에는 손이 젖어있거나 바빠서 앱을 열기 번거롭다. 잠금 화면에서 바로 남은 시간을 보고 싶다. (빈도: 매일 출퇴근 준비 시 3~5회 확인 x 심각도: 중간 = 높음)
- **Current workaround:** 앱을 열어서 홈 화면의 SmartDepartureCard를 확인하거나, 위젯(Small/Medium)에서 대략적인 정보를 본다. 하지만 위젯은 WidgetKit의 timeline 주기로 갱신되어 실시간이 아니고, 카운트다운이 부정확할 수 있다.
- **Success metric:**
  - Live Activity 활성화율 > 60% (스마트 출발 설정 사용자 기준)
  - Live Activity 표시 중 앱 실행 횟수 30% 감소 (출발 준비 시간대)
  - 정시 출발률 +10% 개선 (Live Activity 사용자 vs 미사용자)

---

## Solution

### Overview

iOS 16.1+ ActivityKit를 사용하여 **잠금 화면(Lock Screen)과 Dynamic Island**에 출퇴근 카운트다운을 실시간으로 표시한다. Live Activity는 스마트 출발 카운트다운이 시작되는 시점(출발 60분 전)에 자동으로 시작되고, 출퇴근 세션이 완료되거나 사용자가 수동으로 종료할 때 끝난다.

**왜 Live Activity인가?**
- 잠금 화면에서 앱을 열지 않고 실시간 정보를 확인할 수 있는 유일한 iOS 네이티브 방법이다.
- Dynamic Island는 iPhone 14 Pro 이상에서 가장 눈에 띄는 위치에 정보를 표시한다.
- WidgetKit의 timeline 기반 갱신과 달리, ActivityKit은 초 단위 실시간 업데이트를 지원한다.
- Push-to-update로 서버에서 원격으로 Live Activity 내용을 갱신할 수 있다.

**기술적 접근:**
- `@bacons/apple-targets`로 기존 WidgetKit extension에 Live Activity 코드를 추가한다.
- React Native 측에서는 Expo native module로 ActivityKit을 브릿징하여 Live Activity의 시작/업데이트/종료를 제어한다.
- 잠금 화면 UI는 SwiftUI로 작성하고, 데이터는 App Group UserDefaults를 통해 공유한다.
- 서버 측 push-to-update는 APNs를 통해 Live Activity를 원격 갱신한다.

### User Flow

```
[스마트 출발 카운트다운 시작 (출발 60분 전)]
  │
  ├── 앱이 포그라운드 → 즉시 Live Activity 시작
  │
  └── 앱이 백그라운드/종료 → 푸시 알림 수신 시 Live Activity 시작
        │
        ▼
[잠금 화면 + Dynamic Island에 카운트다운 표시]
  │
  ├── 매 분마다 카운트다운 갱신 (ActivityKit timer)
  │
  ├── 교통 변동 시 → 서버에서 push-to-update로 즉시 갱신
  │
  ├── 출발 시각 도달 → "지금 출발하세요!" 상태로 전환
  │
  ├── Geofence 이탈 (출발 감지) → "이동 중" 상태로 전환
  │     │
  │     ├── 다음 체크포인트 정보 표시
  │     └── 예상 도착 시각 표시
  │
  └── 세션 종료 조건 충족 → Live Activity 종료
        │
        ├── 목적지 Geofence 진입 (자동)
        ├── 사용자 수동 종료 (탭 → 앱 열기 → 종료)
        └── 출발 시각 경과 30분 후 자동 만료
```

### 상세 시나리오

1. **Live Activity 자동 시작**
   - 스마트 출발 설정이 활성 + 오늘이 활성 요일 + 출발 60분 전 도달
   - 앱 포그라운드: `useSmartDepartureToday` 훅에서 `minutesUntilDeparture <= 60` 감지 → Live Activity 시작
   - 앱 백그라운드: 서버에서 "재계산 시작" 푸시 알림 발송 시 → 알림 수신 핸들러에서 Live Activity 시작

2. **실시간 카운트다운**
   - ActivityKit의 `Date` 기반 자동 카운트다운 사용 (배터리 효율적)
   - `optimalDepartureAt`을 target date로 설정하면 OS가 자동으로 "N분 M초 남음" 표시
   - 별도 타이머 불필요 — OS 네이티브 텍스트 카운트다운 활용

3. **교통 변동 갱신**
   - 서버에서 5분 간격 재계산 → 소요시간 변동 감지 → APNs push-to-update 전송
   - Live Activity 내용이 새로운 출발 시각/소요시간으로 즉시 갱신
   - push-to-update payload에 새로운 `ContentState`를 포함

4. **상태 전이**
   - `preparing` → `departureSoon` → `departureNow` → `inTransit` → `arrived` → 종료
   - 각 상태마다 잠금 화면/Dynamic Island UI가 변경됨

5. **세션 종료**
   - 정상: 목적지 Geofence 진입 → "도착했습니다!" 표시 후 10초 뒤 종료
   - 수동: Live Activity 탭 → 앱 열림 → 종료 버튼
   - 타임아웃: 출발 시각 경과 30분 후 자동 만료 (stale state 방지)
   - 시스템: iOS가 최대 12시간 후 자동 종료 (ActivityKit 제한)

---

## Scope (MoSCoW)

### Must have

1. **Live Activity Attributes 정의** — Swift ActivityAttributes + ContentState 타입 선언
2. **잠금 화면 UI (Lock Screen)** — 출발 카운트다운, 모드(출근/퇴근), 다음 체크포인트, 예상 소요시간 표시
3. **Dynamic Island 축소 뷰 (Compact)** — 카운트다운 숫자 + 출발/도착 아이콘
4. **Dynamic Island 확장 뷰 (Expanded)** — 카운트다운 + 경로 요약 + 교통 상태
5. **Expo Native Module 브릿지** — React Native에서 Live Activity 시작/업데이트/종료 API
6. **자동 시작 연동 (P2-2)** — 스마트 출발 카운트다운 시작 시 Live Activity 자동 시작
7. **자동 종료** — 출퇴근 세션 완료 또는 타임아웃 시 Live Activity 종료
8. **출근/퇴근 모드 지원 (P2-4)** — 모드에 따른 UI/아이콘/색상 전환

### Should have

9. **APNs push-to-update** — 서버에서 교통 변동 시 원격으로 Live Activity 갱신
10. **"이동 중" 상태 전환** — Geofence 이탈 감지 시 카운트다운 → 이동 중 UI 전환
11. **다음 체크포인트 정보** — 이동 중 "다음: 강남역 2호선 (3분)" 표시
12. **교통 지연 경고 표시** — 잠금 화면에 "교통 지연" 배지 표시

### Could have

13. **Live Activity 탭 딥링크** — 탭 시 앱의 commute 화면으로 바로 이동
14. **날씨/미세먼지 요약** — 잠금 화면 하단에 오늘 날씨 한 줄 표시
15. **진행률 바** — 전체 경로 대비 현재 진행 상태를 시각적 바로 표시

### Won't have (this cycle)

- **Android Live Activity 대응**: Android에는 Ongoing Notification으로 유사 기능을 구현할 수 있으나, 이번 사이클은 iOS만 대상
- **Apple Watch 연동**: watchOS 컴플리케이션은 별도 사이클
- **음성 카운트다운**: Live Activity에서 음성 안내는 iOS 제한으로 불가
- **교통 상황 지도**: 잠금 화면에 지도를 표시하는 것은 ActivityKit UI 제한으로 불가
- **다국어 지원**: 이번 사이클은 한국어만

---

## RICE Score

| Factor | Score | Rationale |
|--------|-------|-----------|
| **Reach** | 80 | 스마트 출발 사용자 중 iOS 14 Pro+ 사용자 (분기당 80명 추정) |
| **Impact** | 2 (High) | 매일 출퇴근 준비 시 UX 대폭 개선, 앱 개봉 감소 |
| **Confidence** | 70% | ActivityKit은 네이티브 Swift 코드 필요, Expo 통합 복잡도 존재 |
| **Effort** | 2 person-cycles | Swift UI 1 + RN 브릿지 0.5 + 서버 push 0.5 |

**RICE = (80 x 2 x 0.7) / 2 = 56**

---

## UX Wireframe

### 잠금 화면 (Lock Screen) — 출발 준비 상태

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  🚀 출근 준비                      23:45 남음    │
│  ─────────────────────────────────────────────── │
│                                                  │
│  출발 07:45  ──────────────────────►  도착 09:00 │
│              ◉─────────────────────○             │
│              현재            예상 소요 45분       │
│                                                  │
│  🚇 다음: 강남역 2호선 (5분 뒤 도착)             │
│                                                  │
│  ⚠️ 2호선 약간 지연                              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 잠금 화면 — "곧 출발하세요" 상태 (출발 10분 이내)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  🔴 곧 출발하세요!                   8:23 남음   │
│  ─────────────────────────────────────────────── │
│                                                  │
│  출발 07:45  ──────────────────────►  도착 09:00 │
│              ◉━━━━━━━━━━━━━━━━━━━━━○             │
│              지금 출발하면 제시간 도착!           │
│                                                  │
│  🚇 강남역 2호선 3분 뒤 | 🚌 146번 5분 뒤       │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 잠금 화면 — "이동 중" 상태 (Geofence 이탈 후)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  🏃 이동 중 (출근)                도착까지 32분  │
│  ─────────────────────────────────────────────── │
│                                                  │
│  집 ━━━━━━◉ 강남역 ─────── 회사                  │
│            ↑                                     │
│          현재 위치                                │
│                                                  │
│  다음: 🚇 강남역 2호선 (3분 뒤 도착)             │
│  예상 도착: 09:02                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 잠금 화면 — 퇴근 모드

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  🌙 퇴근 준비                      15:30 남음   │
│  ─────────────────────────────────────────────── │
│                                                  │
│  출발 18:00  ──────────────────────►  도착 19:00 │
│              ◉─────────────────────○             │
│              현재            예상 소요 40분       │
│                                                  │
│  🚇 다음: 강남역 2호선 (2분 뒤 도착)             │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Dynamic Island — 축소 뷰 (Compact)

```
┌───────────────────────────────────────────┐
│  왼쪽(leading)         오른쪽(trailing)   │
│  🚀                        23:45         │
│                                           │
│  (출근 아이콘)        (카운트다운 타이머)  │
└───────────────────────────────────────────┘
```

퇴근 모드:
```
┌───────────────────────────────────────────┐
│  🌙                        15:30         │
└───────────────────────────────────────────┘
```

이동 중:
```
┌───────────────────────────────────────────┐
│  🏃                    도착 32분          │
└───────────────────────────────────────────┘
```

### Dynamic Island — 확장 뷰 (Expanded)

```
┌──────────────────────────────────────────────┐
│                                              │
│  🚀 출근 준비              23분 45초 남음    │
│                                              │
│  07:45 출발 → 09:00 도착   소요 45분        │
│  🚇 강남역 2호선 5분 뒤                      │
│                                              │
└──────────────────────────────────────────────┘
```

### Dynamic Island — 최소 뷰 (Minimal, 다른 Live Activity와 공존)

```
┌──────┐
│ 23분 │
└──────┘
```

---

## Data Model

### ActivityKit Attributes (Swift)

```swift
import ActivityKit
import Foundation

// ─── Static Attributes (Live Activity 시작 시 고정) ─────

struct CommuteActivityAttributes: ActivityAttributes {
  /// 출근/퇴근 모드
  let mode: String                    // "commute" | "return"
  /// 경로 이름
  let routeName: String               // "2호선 출근 경로"
  /// 도착 희망 시각
  let arrivalTarget: String           // "09:00"
  /// 체크포인트 목록 (경로 요약)
  let checkpoints: [String]           // ["집", "강남역", "회사"]

  // ─── Dynamic Content State (실시간 갱신) ─────

  struct ContentState: Codable, Hashable {
    /// 최적 출발 시각 (ISO 8601)
    let optimalDepartureAt: Date
    /// 예상 소요시간 (분)
    let estimatedTravelMin: Int
    /// 현재 상태
    let status: String                // "preparing" | "departureSoon" | "departureNow"
                                      // | "inTransit" | "arrived"
    /// 출발까지 남은 분 (preparing/departureSoon/departureNow 상태)
    let minutesUntilDeparture: Int
    /// 도착까지 남은 분 (inTransit 상태)
    let minutesUntilArrival: Int?
    /// 현재 체크포인트 인덱스 (inTransit 상태)
    let currentCheckpointIndex: Int?
    /// 다음 체크포인트 이름
    let nextCheckpoint: String?
    /// 다음 교통 정보 (예: "2호선 3분 뒤")
    let nextTransitInfo: String?
    /// 교통 지연 여부
    let hasTrafficDelay: Bool
    /// 교통 지연 메시지 (있을 때만)
    let trafficDelayMessage: String?
    /// 예상 도착 시각 (HH:mm)
    let estimatedArrivalTime: String?
    /// 마지막 갱신 시각
    let updatedAt: Date
  }
}
```

### App Group 공유 데이터 (UserDefaults)

기존 `SharedDataReader`를 확장하여 Live Activity 상태를 공유:

```swift
// SharedDataReader 확장
extension SharedDataReader {
  private static let liveActivityDataKey = "liveActivityData"

  static func readLiveActivityData() -> LiveActivityData? { ... }
  static func writeLiveActivityData(_ data: LiveActivityData) { ... }
  static func clearLiveActivityData() { ... }
}

struct LiveActivityData: Codable {
  let activityId: String              // ActivityKit activity ID
  let mode: String                    // "commute" | "return"
  let startedAt: String              // ISO 8601
  let isActive: Bool
}
```

---

## API Contract

### 1. 기존 API 활용 (변경 없음)

Live Activity의 데이터 소스는 기존 API를 그대로 사용한다.

| API | 용도 | 갱신 시점 |
|-----|------|----------|
| `GET /smart-departure/today` | 출발 시각, 소요시간, 상태 | Live Activity 시작 시 + 주기적 폴링 |
| `GET /widget/data` | 교통 정보, 날씨 | Live Activity 갱신 시 (보조) |

### 2. 신규 API: Push-to-Update Token 등록

Live Activity를 서버에서 원격 갱신하려면, ActivityKit이 발급하는 **push token**을 서버에 등록해야 한다.

**POST /live-activity/register**

```typescript
// Request
type RegisterLiveActivityDto = {
  pushToken: string;                  // ActivityKit push token (base64)
  activityId: string;                 // 클라이언트 측 activity ID
  mode: 'commute' | 'return';        // 출근/퇴근
  settingId: string;                  // smart departure setting ID
};

// Response (201)
type RegisterLiveActivityResponseDto = {
  id: string;
  registered: boolean;
};
```

**DELETE /live-activity/:activityId**

```typescript
// 세션 종료 시 push token 해제
// Response (204) No Content
```

### 3. 신규 API: Push-to-Update 전송 (서버 내부)

서버에서 교통 변동 감지 시 APNs를 통해 Live Activity를 갱신한다. 이것은 외부 API가 아니라 서버 내부 로직이다.

```typescript
// 서버 내부 서비스 (LiveActivityPushService)
type LiveActivityPushPayload = {
  aps: {
    timestamp: number;                // Unix timestamp
    event: 'update' | 'end';         // 갱신 또는 종료
    'content-state': {
      optimalDepartureAt: string;    // ISO 8601
      estimatedTravelMin: number;
      status: string;
      minutesUntilDeparture: number;
      minutesUntilArrival: number | null;
      currentCheckpointIndex: number | null;
      nextCheckpoint: string | null;
      nextTransitInfo: string | null;
      hasTrafficDelay: boolean;
      trafficDelayMessage: string | null;
      estimatedArrivalTime: string | null;
      updatedAt: string;
    };
    'stale-date'?: number;           // Unix timestamp (stale 처리 시각)
    'dismissal-date'?: number;       // Unix timestamp (자동 종료 시각, event=end)
  };
};
```

### 4. 데이터 흐름

```
[서버: 스마트 출발 재계산]
  │
  ├── 소요시간 변동 감지
  │     │
  │     ▼
  │   [서버: APNs push-to-update 전송]
  │     │
  │     ▼
  │   [iOS: Live Activity ContentState 자동 갱신]
  │
  └── 변동 없음 → 아무 동작 안 함 (OS의 Date 카운트다운이 자동 진행)

[앱 포그라운드: useSmartDepartureToday 훅]
  │
  ├── 매 분 폴링 → ContentState 업데이트 (보조)
  │
  └── Geofence 이탈 감지 → 상태 "inTransit" 전환 → ContentState 업데이트
```

---

## Technical Architecture

### 파일 구조

```
mobile/
  targets/
    widget/
      Sources/
        CommuteWidget.swift              # 기존 (변경)
        CommuteActivityAttributes.swift  # [NEW] ActivityAttributes 정의
        CommuteActivityView.swift        # [NEW] 잠금 화면 View
        CommuteDynamicIsland.swift       # [NEW] Dynamic Island Views
        LiveActivityManager.swift        # [NEW] Live Activity 시작/갱신/종료 헬퍼
      expo-target.config.js              # 기존 (변경: ActivityKit 프레임워크 추가)
  modules/
    live-activity/                       # [NEW] Expo Native Module
      index.ts                           # JS 브릿지 (export)
      ios/
        LiveActivityModule.swift         # Swift → RN 브릿지
        LiveActivityModule.m             # ObjC 브릿지 헤더
  src/
    services/
      live-activity.service.ts           # [NEW] Live Activity 서비스 (시작/갱신/종료)
    hooks/
      useLiveActivity.ts                 # [NEW] Live Activity 상태 관리 훅
    types/
      live-activity.ts                   # [NEW] 타입 정의

backend/src/
  application/
    services/
      live-activity-push.service.ts      # [NEW] APNs push-to-update 전송
    dto/
      live-activity.dto.ts               # [NEW] 등록/해제 DTO
  presentation/
    controllers/
      live-activity.controller.ts        # [NEW] push token 등록/해제 엔드포인트
    modules/
      live-activity.module.ts            # [NEW] 모듈
  domain/
    entities/
      live-activity-token.entity.ts      # [NEW] push token 저장 엔티티
```

### 기존 코드 변경

| 파일 | 변경 내용 |
|------|----------|
| `targets/widget/expo-target.config.js` | `frameworks`에 `ActivityKit` 추가, `deploymentTarget`을 `16.1`로 변경 |
| `targets/widget/Sources/CommuteWidget.swift` | `WidgetBundle`에 Live Activity 추가 |
| `src/hooks/useSmartDepartureToday.ts` | Live Activity 자동 시작/종료 로직 추가 |
| `src/hooks/useGeofence.ts` | Geofence 이탈 시 Live Activity 상태 전환 연동 |
| `backend: RecalculateDeparture UseCase` | 교통 변동 시 push-to-update 전송 추가 |

### Expo Native Module 브릿지

```typescript
// modules/live-activity/index.ts

import { NativeModules, Platform } from 'react-native';

type StartLiveActivityParams = {
  mode: 'commute' | 'return';
  routeName: string;
  arrivalTarget: string;
  checkpoints: string[];
  optimalDepartureAt: string;          // ISO 8601
  estimatedTravelMin: number;
  nextCheckpoint?: string;
  nextTransitInfo?: string;
};

type UpdateLiveActivityParams = {
  activityId: string;
  optimalDepartureAt: string;
  estimatedTravelMin: number;
  status: string;
  minutesUntilDeparture: number;
  minutesUntilArrival?: number;
  currentCheckpointIndex?: number;
  nextCheckpoint?: string;
  nextTransitInfo?: string;
  hasTrafficDelay: boolean;
  trafficDelayMessage?: string;
  estimatedArrivalTime?: string;
};

type LiveActivityInfo = {
  activityId: string;
  pushToken: string;                   // base64 encoded APNs token
  isActive: boolean;
};

export const liveActivityModule = {
  /** iOS에서만 동작. Android는 no-op. */
  async startActivity(params: StartLiveActivityParams): Promise<LiveActivityInfo | null> {
    if (Platform.OS !== 'ios') return null;
    return NativeModules.LiveActivityModule.startActivity(params);
  },

  async updateActivity(params: UpdateLiveActivityParams): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return NativeModules.LiveActivityModule.updateActivity(params);
  },

  async endActivity(activityId: string): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return NativeModules.LiveActivityModule.endActivity(activityId);
  },

  async endAllActivities(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return NativeModules.LiveActivityModule.endAllActivities();
  },

  async isSupported(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return NativeModules.LiveActivityModule.isSupported();
  },

  async getActiveActivity(): Promise<LiveActivityInfo | null> {
    if (Platform.OS !== 'ios') return null;
    return NativeModules.LiveActivityModule.getActiveActivity();
  },
};
```

### DB 스키마 (서버 push token 저장)

```sql
CREATE TABLE alert_system.live_activity_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES alert_system.users(id) ON DELETE CASCADE,
  activity_id     VARCHAR(255) NOT NULL,
  push_token      TEXT NOT NULL,
  mode            VARCHAR(20) NOT NULL,      -- 'commute' | 'return'
  setting_id      UUID REFERENCES alert_system.smart_departure_settings(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX live_activity_tokens_user_id_idx
  ON alert_system.live_activity_tokens(user_id);
CREATE UNIQUE INDEX live_activity_tokens_activity_id_unique
  ON alert_system.live_activity_tokens(activity_id);
CREATE INDEX live_activity_tokens_active_idx
  ON alert_system.live_activity_tokens(is_active)
  WHERE is_active = true;
```

---

## Edge Cases

| 시나리오 | 처리 |
|----------|------|
| **iOS 버전 < 16.1** | `isSupported()` 체크 → false면 Live Activity 관련 UI 숨김. 기존 위젯/앱 내 카운트다운만 사용. |
| **사용자가 Live Activity 권한 OFF** | 설정 > 스마트 출발에서 "잠금 화면에 표시하려면 Live Activity를 허용해주세요" 안내 + 설정 앱 딥링크. |
| **앱이 백그라운드/종료 상태** | push-to-update로 갱신. 앱 포그라운드 복귀 시 최신 데이터로 동기화. |
| **네트워크 끊김** | 마지막으로 수신한 ContentState 유지. Date 기반 카운트다운은 오프라인에서도 계속 동작. 재연결 시 서버에서 최신 데이터 fetch 후 업데이트. |
| **출퇴근 취소 (사용자가 안 나감)** | 출발 시각 경과 30분 후 자동 만료 + "출발 시각이 지났습니다" 상태 표시 후 종료. |
| **복수 Live Activity 충돌** | 출근 + 퇴근 동시에 활성화 방지. 새 Live Activity 시작 시 기존 것 종료. |
| **Dynamic Island 미지원 기기 (iPhone 14 이전)** | 잠금 화면 위젯만 표시. Dynamic Island UI는 자동으로 무시됨 (ActivityKit 내장 동작). |
| **배터리 절약 모드** | Live Activity 갱신 빈도가 OS에 의해 자동 조절될 수 있음. Date 기반 카운트다운은 영향 없음. |
| **교통 API 장애** | 서버에서 fallback 처리 (히스토리 평균). push-to-update 미발송. Live Activity는 기존 데이터로 유지. |
| **앱 강제 종료 (kill)** | Live Activity는 앱과 독립적으로 유지됨. push-to-update로 계속 갱신 가능. 앱 재실행 시 기존 activity 복원. |
| **여러 경로/설정 동시 활성** | 현재 시간대에 가장 가까운 설정 1개만 Live Activity로 표시. |
| **Geofence 이탈 후 다시 진입 (잊은 물건)** | 재진입 감지 시 Live Activity를 "preparing" 상태로 되돌림. |
| **push token 만료** | ActivityKit이 새 token 발급 시 서버에 재등록. token observer 구현. |
| **iOS 시스템 12시간 제한** | Live Activity는 최대 12시간 유지. 일반 출퇴근(1시간 내외)에는 문제없음. |

---

## Acceptance Criteria

### Live Activity 시작/종료

- [ ] Given 스마트 출발 설정이 활성이고 iOS 16.1+ 기기일 때, When 출발 60분 전이 되면, Then 잠금 화면에 출발 카운트다운 Live Activity가 자동으로 시작된다.
- [ ] Given Live Activity가 활성 상태일 때, When 사용자가 잠금 화면을 보면, Then "출발까지 N분 M초" 카운트다운이 실시간으로 감소하며 표시된다.
- [ ] Given 출퇴근 세션이 완료(목적지 Geofence 진입)되면, When Live Activity가 활성 상태일 때, Then "도착했습니다!" 메시지를 표시하고 10초 후 Live Activity가 종료된다.
- [ ] Given 출발 시각이 30분 이상 경과하고 Geofence 이탈이 감지되지 않았을 때, When 타임아웃이 발생하면, Then Live Activity가 자동으로 만료되어 종료된다.
- [ ] Given Live Activity가 활성 상태일 때, When 사용자가 Live Activity를 탭하면, Then 앱이 열리고 출퇴근 화면으로 이동한다.

### 상태 전이

- [ ] Given 출발 30분 이상 남았을 때, When Live Activity가 표시되면, Then "출근 준비" 상태(파란 계열)로 표시된다.
- [ ] Given 출발 10분 이내가 되면, When Live Activity가 갱신되면, Then "곧 출발하세요!" 상태(빨간 계열)로 전환되고 긴급 UI가 표시된다.
- [ ] Given 사용자가 집 Geofence를 이탈(출발)하면, When Live Activity가 갱신되면, Then "이동 중" 상태로 전환되고 다음 체크포인트 + 예상 도착 시각이 표시된다.

### Dynamic Island

- [ ] Given Dynamic Island 지원 기기(iPhone 14 Pro+)에서, When Live Activity가 활성일 때, Then Compact 뷰에 모드 아이콘과 카운트다운이 표시된다.
- [ ] Given Dynamic Island를 길게 터치하면, When Expanded 뷰가 열리면, Then 출발 시각, 도착 시각, 예상 소요시간, 교통 정보가 표시된다.
- [ ] Given 다른 앱의 Live Activity와 Dynamic Island를 공유할 때, When Minimal 뷰가 표시되면, Then 남은 분만 간결하게 표시된다.

### 출근/퇴근 모드 (P2-4 연동)

- [ ] Given 출근 모드에서 Live Activity가 시작되면, When 잠금 화면을 보면, Then 출근 아이콘(🚀)과 파란/오렌지 컬러 테마로 표시된다.
- [ ] Given 퇴근 모드에서 Live Activity가 시작되면, When 잠금 화면을 보면, Then 퇴근 아이콘(🌙)과 보라색 컬러 테마로 표시된다.

### Push-to-Update (Should)

- [ ] Given Live Activity가 활성이고 서버에서 교통 지연을 감지하면, When push-to-update가 전송되면, Then 잠금 화면의 소요시간과 출발 시각이 즉시 갱신되고 "교통 지연" 배지가 표시된다.
- [ ] Given Live Activity push token이 서버에 등록된 상태에서, When token이 만료되면, Then 앱이 새 token을 받아 서버에 재등록한다.

### 비기능 요구사항

- [ ] TypeScript 에러 0개 (`tsc --noEmit` 통과)
- [ ] Swift 컴파일 에러 0개 (Xcode 빌드 성공)
- [ ] Live Activity 시작 응답 시간 < 500ms
- [ ] 기존 WidgetKit(Small/Medium) 위젯 기능 회귀 없음
- [ ] 기존 스마트 출발(P2-2) 카운트다운 기능 회귀 없음
- [ ] iOS 16.0 미만 기기에서 크래시 없음 (graceful degradation)
- [ ] 배터리 영향 최소화 — Date 기반 카운트다운 사용, 별도 타이머 없음

---

## Task Breakdown

### iOS Native (Swift)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| SW-1 | `CommuteActivityAttributes.swift` 정의 | S | none | ActivityAttributes + ContentState Codable 구조체 |
| SW-2 | `CommuteActivityView.swift` 잠금 화면 UI | M | SW-1 | 상태별(preparing, departureSoon, departureNow, inTransit, arrived) 잠금 화면 SwiftUI 뷰 |
| SW-3 | `CommuteDynamicIsland.swift` Dynamic Island UI | M | SW-1 | Compact, Expanded, Minimal 뷰 + 모드별(출근/퇴근) 스타일 |
| SW-4 | `LiveActivityManager.swift` 헬퍼 | S | SW-1 | start/update/end/getActive 정적 메서드 |
| SW-5 | `CommuteWidget.swift` 수정 | S | SW-2, SW-3 | WidgetBundle에 Live Activity 등록 |
| SW-6 | `expo-target.config.js` 수정 | S | none | ActivityKit 프레임워크 추가, deploymentTarget 16.1 |

### Expo Native Module (Swift + TypeScript)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| NM-1 | `LiveActivityModule.swift` 네이티브 브릿지 | M | SW-4 | RN → Swift 브릿지 (startActivity, updateActivity, endActivity, isSupported, getActiveActivity) |
| NM-2 | `modules/live-activity/index.ts` JS 래퍼 | S | NM-1 | Platform 체크 + 타입 안전 래퍼 함수 |
| NM-3 | Push token observer 구현 | S | NM-1 | ActivityKit pushTokenUpdates 구독 → RN 이벤트 전달 |

### Mobile (React Native)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| FE-1 | `types/live-activity.ts` 타입 정의 | S | none | Live Activity 관련 모든 TypeScript 타입 |
| FE-2 | `services/live-activity.service.ts` 서비스 | S | NM-2, FE-1 | Live Activity 시작/갱신/종료 + push token 서버 등록/해제 |
| FE-3 | `hooks/useLiveActivity.ts` 훅 | M | FE-2 | Live Activity 생명주기 관리 (자동 시작/갱신/종료) + push token 관리 |
| FE-4 | `useSmartDepartureToday` 통합 | S | FE-3 | 기존 훅에 Live Activity 자동 시작/종료 로직 추가 |
| FE-5 | `useGeofence` 통합 | S | FE-3 | Geofence 이탈 시 Live Activity "inTransit" 상태 전환 |

### Backend (NestJS)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| BE-1 | `live-activity-token.entity.ts` 엔티티 | S | none | push token 저장 ORM 엔티티 |
| BE-2 | `live-activity.dto.ts` DTO | S | none | 등록/해제 DTO + validation |
| BE-3 | `live-activity.controller.ts` 컨트롤러 | S | BE-1, BE-2 | POST /live-activity/register, DELETE /live-activity/:activityId |
| BE-4 | `live-activity-push.service.ts` 푸시 서비스 | M | BE-1 | APNs HTTP/2 push-to-update 전송 로직 |
| BE-5 | `RecalculateDeparture` 확장 | S | BE-4 | 교통 변동 감지 시 push-to-update 전송 추가 |
| BE-6 | `live-activity.module.ts` 모듈 | S | BE-3, BE-4 | DI 설정 + 모듈 등록 |
| BE-7 | Backend Unit Tests | S | BE-4 | push-to-update payload 생성 + token 관리 테스트 |

### 의존성 순서

```
SW-1 → SW-2, SW-3, SW-4
SW-2, SW-3 → SW-5
SW-4 → NM-1
NM-1 → NM-2, NM-3
NM-2 → FE-2
FE-2 → FE-3
FE-3 → FE-4, FE-5
BE-1 → BE-3, BE-4
BE-4 → BE-5
```

**병렬 가능:**
- (Swift UI: SW-1~SW-6) || (Backend: BE-1~BE-7) — 동시 진행 가능
- Swift 완료 후 Native Module → React Native 순서

---

## Open Questions

1. **APNs push-to-update 인증 방식**: APNs에 HTTP/2 연결하려면 인증서(.p8 key)가 필요하다. 이미 Expo Push에서 사용 중인 키를 재사용할 수 있는가?
   - **조사 필요**: Expo Push 서비스가 Live Activity push-to-update를 지원하는지 확인. 미지원 시 직접 APNs 연결 필요.
   - **대안**: 초기에는 push-to-update 없이 앱 포그라운드 폴링만으로 시작하고, push-to-update는 Should로 이동.

2. **`@bacons/apple-targets`에서 ActivityKit 지원 여부**: 기존 WidgetKit extension에 Live Activity를 추가할 때, 빌드 설정이 자동으로 처리되는가?
   - **확인 필요**: Expo prebuild 후 Xcode 프로젝트에서 ActivityKit 프레임워크와 `NSSupportsLiveActivities` Info.plist 엔트리가 올바르게 설정되는지 검증.

3. **React Native → ActivityKit 브릿지 라이브러리 선택**: 직접 Expo native module을 작성할 것인가, `react-native-live-activity` 같은 서드파티를 사용할 것인가?
   - **현재 기울기**: 직접 Expo native module 작성. 이유: (1) 프로젝트에 이미 Expo native module 패턴이 있음(WidgetDataSync), (2) 서드파티 라이브러리의 유지보수/호환성 위험 감소, (3) 우리 데이터 모델에 정확히 맞는 API 설계 가능.

4. **iOS Simulator에서 테스트 가능성**: Live Activity는 iOS Simulator에서 제한적으로만 테스트 가능하다. Dynamic Island는 실물 기기에서만 확인 가능.
   - **대응**: 잠금 화면 UI는 Simulator에서 Xcode Preview로 개발. Dynamic Island는 실물 기기로 최종 검증. CI에서는 빌드 성공만 확인.

---

## Out of Scope

- **Android Ongoing Notification**: Android에서 유사한 "진행 중" 알림 표시는 이번 사이클 제외. 별도 P2-6으로 검토.
- **watchOS 컴플리케이션**: Apple Watch에서 카운트다운 표시는 ActivityKit과 별개 구현 필요. 별도 사이클.
- **StandBy 모드 (iOS 17)**: iPhone 충전 중 가로 모드에서의 Live Activity 표시는 OS가 자동 처리하므로 별도 작업 불필요.
- **Interactive Live Activity (iOS 18)**: 버튼 등 인터랙티브 요소는 iOS 18+ 기능. 이번 사이클은 정보 표시만.
- **다국어 지원**: 한국어 전용.
- **Live Activity 히스토리/분석**: 사용자의 Live Activity 사용 패턴 추적은 향후 검토.

---

## Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `@bacons/apple-targets` ActivityKit 호환 이슈 | Medium | High | Expo prebuild 후 수동 Xcode 설정 fallback 준비. EAS Build에서 post-build 스크립트로 Info.plist 수정. |
| APNs push-to-update 인증 설정 복잡 | Medium | Medium | 초기에는 push-to-update 없이 앱 폴링만으로 MVP 완성. push는 Should 항목. |
| ActivityKit API 변경 (iOS 버전 차이) | Low | Medium | iOS 16.1을 최소 타겟으로 설정. `#available` 체크로 버전별 분기. |
| 배터리 소모 우려 | Low | High | Date 기반 OS 네이티브 카운트다운 사용. 별도 Timer 금지. push-to-update 빈도 제한 (5분 이상 간격). |
| Native Module 브릿지 복잡도 | Medium | Medium | 기존 WidgetDataSync 모듈 패턴 그대로 참고. 최소한의 브릿지 API만 노출. |
| Xcode/Swift 빌드 환경 이슈 | Medium | High | EAS Build를 통한 빌드 검증. 로컬 빌드 + Simulator 테스트 병행. |

---

*v1.0 | 2026-02-20 | PM Agent*
