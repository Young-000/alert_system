# P1-5: FCM/APNs Push Notifications (Expo Push)

> Cycle 28 | Branch: `feature/push-notifications`

## JTBD

When **I'm commuting and my phone is locked or the app is closed**, I want to **receive native push notifications with my commute briefing (weather, transit, air quality)**, so I can **glance at my lock screen and make decisions without opening any app**.

## Problem

- **Who:** 수도권 대중교통 출퇴근 직장인 (모바일 앱 사용자)
- **Pain:** (매일 2회 x 높음) 현재 알림톡(카카오)은 카카오톡 앱을 열어야 확인 가능. Web Push는 브라우저 기반이라 네이티브 앱에서 동작하지 않음. 앱을 닫으면 알림을 받을 방법이 없다.
- **Current workaround:** 알림 시간에 직접 앱을 열거나, 카카오톡에서 알림톡을 찾아 읽음
- **Success metric:**
  - 푸시 권한 허용률 > 70% (앱 설치자 중)
  - 푸시 발송 성공률 > 95%
  - 알림 탭 후 앱 오픈률 > 40%

---

## Solution

### Overview

Expo Push Notifications를 활용하여 FCM(Android) / APNs(iOS) 네이티브 푸시 채널을 추가한다. 기존 알림 시스템(EventBridge -> SendNotificationUseCase -> Solapi + Web Push)의 마지막 단계에 Expo Push 발송을 병렬로 추가하는 방식이며, 기존 코드 변경을 최소화한다.

핵심 설계 결정: `push_subscriptions` 테이블에 `platform` 컬럼(`'web' | 'expo'`)을 추가하여 단일 테이블로 관리한다. 새 테이블을 만들지 않는다. 이유: (1) `sendToUser(userId)`로 해당 유저의 모든 구독을 한 번에 조회하는 기존 패턴 유지, (2) 로그아웃 시 cleanup 로직 단순화, (3) 유저별 디바이스 관리가 한 곳에서 가능.

### User Flow

```
[앱 최초 실행 / 로그인 후]
  -> OS 푸시 권한 요청 다이얼로그
  -> 허용 -> Expo Push Token 획득
  -> POST /push/expo-token -> 서버에 토큰 저장
  -> 알림 시간 도래 -> EventBridge -> SendNotificationUseCase
    -> Solapi 알림톡 (메인)
    -> Web Push (PWA 보조)
    -> Expo Push (네이티브 앱 보조) <- NEW
  -> 사용자 잠금화면/알림센터에서 알림 확인
  -> 알림 탭 -> 앱 열림 -> 해당 화면(홈/출퇴근)으로 이동
```

```
[설정에서 비활성화]
  -> 설정 탭 -> "푸시 알림" 토글 OFF
  -> DELETE /push/expo-token -> 서버에서 토큰 삭제
  -> 더 이상 Expo Push 수신 안 함

[로그아웃]
  -> 로그아웃 -> 자동으로 DELETE /push/expo-token 호출
  -> 서버에서 해당 유저의 expo 토큰 전부 삭제
```

### Scope (MoSCoW)

**Must have:**
- Expo Push Token 등록/해제 API (POST/DELETE `/push/expo-token`)
- `expo-server-sdk` 기반 Expo Push 발송 서비스
- `SendNotificationUseCase`에서 Expo Push 발송 통합
- 앱 시작 시 푸시 권한 요청 + 토큰 등록
- 포그라운드 알림 처리 (인앱 배너)
- 백그라운드 알림 수신 (OS 네이티브)
- 알림 탭 시 딥링크 이동
- 로그아웃 시 토큰 cleanup
- `push_subscriptions` 테이블에 `platform` 컬럼 추가
- 기존 Solapi + Web Push 동작에 영향 없음

**Should have:**
- 설정 탭에 "푸시 알림" 토글 UI
- 토큰 갱신 감지 (앱 업데이트 후 토큰 변경 시 자동 재등록)
- 발송 실패 시 만료 토큰 자동 정리 (DeviceNotRegistered 처리)
- 알림 로그에 채널 구분 (web_push / expo_push / solapi)

**Could have:**
- 알림 카테고리 설정 (날씨만/교통만 알림 선택)
- 알림 소리/진동 커스터마이징
- 배지 카운트 관리

**Won't have (this cycle):**
- Rich notification (이미지, 액션 버튼)
- 알림 그룹핑/스택
- 사일런트 푸시 (백그라운드 데이터 업데이트)
- 알림 예약 발송 (로컬 노티피케이션)
- Android 알림 채널 커스터마이징

---

## API Contracts

### 1. POST `/push/expo-token` -- Expo Push Token 등록

**Request:**
```typescript
// Headers
Authorization: Bearer <jwt>

// Body
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response (201):**
```typescript
{
  "success": true
}
```

**Behavior:**
- 같은 `token`이 이미 존재하면 `userId`를 업데이트 (디바이스 소유자 변경 대응)
- 같은 `userId` + `token` 조합이 이미 존재하면 no-op (멱등)
- `platform`은 서버에서 `'expo'`로 자동 설정

**Error cases:**
| Status | Condition |
|--------|-----------|
| 400 | `token`이 빈 문자열이거나 `ExponentPushToken[` 형식이 아닌 경우 |
| 401 | JWT 없거나 만료 |

### 2. DELETE `/push/expo-token` -- Expo Push Token 해제

**Request:**
```typescript
// Headers
Authorization: Bearer <jwt>

// Body
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response (200):**
```typescript
{
  "success": true
}
```

**Behavior:**
- 해당 `token`이 존재하지 않아도 200 반환 (멱등)
- `userId` 일치 여부도 검증 (다른 유저의 토큰 삭제 방지)

**Error cases:**
| Status | Condition |
|--------|-----------|
| 400 | `token`이 빈 문자열 |
| 401 | JWT 없거나 만료 |

### 3. 기존 엔드포인트 (변경 없음)

- `POST /push/subscribe` -- Web Push 구독 (기존 유지)
- `POST /push/unsubscribe` -- Web Push 해제 (기존 유지)
- `POST /scheduler/trigger/:alertId` -- 알림 트리거 (내부적으로 Expo Push 추가 발송)

---

## Database Schema Changes

### `push_subscriptions` 테이블 변경

**새 컬럼 추가:**

```sql
ALTER TABLE alert_system.push_subscriptions
  ADD COLUMN platform VARCHAR(10) NOT NULL DEFAULT 'web';
```

**변경 후 스키마:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| user_id | uuid | NO | - | FK -> users.id |
| endpoint | text | NO | - | Web Push: subscription endpoint, Expo: push token |
| keys | text | NO | - | Web Push: `{p256dh, auth}` JSON, Expo: `'{}'` (빈 JSON) |
| platform | varchar(10) | NO | `'web'` | `'web'` or `'expo'` |
| created_at | timestamptz | NO | now() | |

**인덱스 변경:**

```sql
-- 기존 endpoint unique 인덱스는 유지 (Expo token도 globally unique)
-- platform별 조회를 위한 복합 인덱스 추가
CREATE INDEX push_subscriptions_user_id_platform_idx
  ON alert_system.push_subscriptions (user_id, platform);
```

**마이그레이션 전략:**
- `platform` 컬럼 기본값 `'web'`이므로 기존 레코드는 자동으로 web으로 분류
- Expo 토큰은 `endpoint` 컬럼에 `ExponentPushToken[...]` 형태로 저장
- Expo 토큰은 `keys` 컬럼에 `'{}'` (빈 JSON 객체)를 저장 (Web Push와 스키마 통일, NOT NULL 제약 유지)

### TypeORM Entity 변경

```typescript
// push-subscription.entity.ts 변경

@Entity('push_subscriptions', { schema: 'alert_system' })
@Index(['userId'])
@Index(['endpoint'], { unique: true })
@Index(['userId', 'platform'])
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'text' })
  keys: string;

  @Column({ type: 'varchar', length: 10, default: 'web' })
  platform: 'web' | 'expo';

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

---

## Backend Changes

### 1. New: `ExpoPushService` (`backend/src/infrastructure/messaging/expo-push.service.ts`)

```typescript
export const EXPO_PUSH_SERVICE = Symbol('EXPO_PUSH_SERVICE');

export interface IExpoPushService {
  sendToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<number>;
}
```

**Implementation details:**
- `expo-server-sdk` npm 패키지 사용 (`Expo` 클래스)
- `PushSubscriptionEntity`에서 `platform = 'expo'`인 레코드만 조회
- `Expo.chunkPushNotifications()` + `Expo.sendPushNotificationsAsync()` 패턴
- 발송 결과에서 `DeviceNotRegistered` 에러 시 해당 토큰 자동 삭제
- `NoopExpoPushService` 구현 제공 (테스트 / SDK 미설정 시 fallback)

**Key behaviors:**
```
sendToUser(userId, title, body, data)
  1. SELECT * FROM push_subscriptions WHERE user_id = $1 AND platform = 'expo'
  2. subscriptions가 없으면 return 0
  3. Expo.chunkPushNotifications(messages)
  4. 각 chunk에 대해 sendPushNotificationsAsync()
  5. 결과 확인:
     - 'ok' -> sent++
     - 'DeviceNotRegistered' -> DELETE FROM push_subscriptions WHERE id = $id
     - 기타 에러 -> logger.warn
  6. return sent (발송 성공 수)
```

### 2. Modified: `PushController` (`backend/src/presentation/controllers/push.controller.ts`)

**추가할 엔드포인트:**

```typescript
// DTO
class ExpoTokenDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^ExponentPushToken\[.+\]$/, {
    message: 'Invalid Expo Push Token format',
  })
  token: string;
}

// Endpoints
@Post('expo-token')
@HttpCode(HttpStatus.CREATED)
async registerExpoToken(
  @Request() req: AuthenticatedRequest,
  @Body() dto: ExpoTokenDto,
): Promise<{ success: boolean }>

@Delete('expo-token')
@HttpCode(HttpStatus.OK)
async removeExpoToken(
  @Request() req: AuthenticatedRequest,
  @Body() dto: ExpoTokenDto,
): Promise<{ success: boolean }>
```

**registerExpoToken logic:**
1. `findOne({ where: { endpoint: dto.token } })`
2. 존재하면 -> `userId` 업데이트 (디바이스 양도 케이스)
3. 없으면 -> `save({ userId, endpoint: dto.token, keys: '{}', platform: 'expo' })`

**removeExpoToken logic:**
1. `delete({ userId: req.user.userId, endpoint: dto.token, platform: 'expo' })`
2. 결과에 관계없이 `{ success: true }` 반환 (멱등)

### 3. Modified: `WebPushService` (`backend/src/infrastructure/messaging/web-push.service.ts`)

**변경 범위: 최소**

```typescript
// sendToUser에서 platform = 'web' 필터 추가
const subscriptions = await this.subscriptionRepo.find({
  where: { userId, platform: 'web' },
});
```

이 변경 하나로 Web Push는 `platform = 'web'`인 구독만 조회하여 Expo 토큰에 VAPID 푸시를 보내는 실수를 방지한다.

### 4. Modified: `SendNotificationUseCase` (`backend/src/application/use-cases/send-notification.use-case.ts`)

**변경 사항:**

```typescript
// Constructor에 ExpoPushService 추가
@Optional() @Inject(EXPO_PUSH_SERVICE) private expoPushService?: IExpoPushService,

// execute() 마지막 단계에서 기존 sendWebPush 호출 이후:
private sendExpoPush(alert: Alert, summary: string): void {
  if (!this.expoPushService) return;
  this.expoPushService.sendToUser(
    alert.userId,
    alert.name,
    summary,
    { url: '/', alertId: alert.id },
  ).catch(err => this.logger.warn(`Expo push failed: ${err}`));
}
```

**호출 위치 (execute 메서드 내):**
```typescript
try {
  await this.sendNotification(user.name, user.phoneNumber, alert, data, timeType);
  await this.saveNotificationLog(alert, 'success', logSummary);
  this.sendWebPush(alert, logSummary);    // 기존
  this.sendExpoPush(alert, logSummary);   // NEW
} catch (error) {
  // ... 기존 fallback 로직
}
```

Expo Push는 fire-and-forget (.catch로 에러만 로깅). 알림톡 실패와 무관하게 독립 발송한다.

### 5. Modified: `PushModule` (`backend/src/presentation/modules/push.module.ts`)

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([PushSubscriptionEntity])],
  controllers: [PushController],
  providers: [
    WebPushService,
    { provide: WEB_PUSH_SERVICE, useExisting: WebPushService },
    ExpoPushService,
    { provide: EXPO_PUSH_SERVICE, useExisting: ExpoPushService },
  ],
  exports: [WEB_PUSH_SERVICE, EXPO_PUSH_SERVICE, TypeOrmModule],
})
export class PushModule {}
```

### 6. New npm dependency

```bash
cd backend && npm install expo-server-sdk
```

`expo-server-sdk` (https://github.com/expo/expo-server-sdk-node):
- Bundle size: ~15KB (lightweight)
- Handles chunking, receipts, error codes
- Official Expo SDK for Node.js servers

---

## Frontend (Mobile) Changes

### 1. New: `usePushNotifications` hook (`mobile/src/hooks/usePushNotifications.ts`)

앱 전역에서 푸시 알림을 관리하는 단일 훅.

```typescript
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { pushService } from '@/services/push.service';
import { useAuth } from '@/hooks/useAuth';

type PushNotificationState = {
  expoPushToken: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
};
```

**Responsibilities:**
1. 앱 시작 시 권한 확인 + 토큰 획득 + 서버 등록 (로그인 상태일 때만)
2. 포그라운드 알림 수신 리스너 등록
3. 알림 탭 이벤트 리스너 -> 딥링크 이동
4. `enable()` / `disable()` -- 설정 토글에서 호출
5. 토큰 변경 감지 -> 서버 재등록

**Lifecycle:**
```
[로그인 완료]
  -> usePushNotifications 활성화
  -> requestPermissionsAsync()
    -> 허용: getExpoPushTokenAsync() -> POST /push/expo-token
    -> 거부: isEnabled = false, 설정 안내
  -> setNotificationHandler (포그라운드 알림 표시)
  -> addNotificationResponseReceivedListener (탭 -> 이동)

[로그아웃]
  -> disable() -> DELETE /push/expo-token

[설정 토글 OFF]
  -> disable() -> DELETE /push/expo-token
  -> isEnabled = false

[설정 토글 ON]
  -> enable() -> requestPermissionsAsync() -> 토큰 등록
```

### 2. New: `push.service.ts` (`mobile/src/services/push.service.ts`)

```typescript
import { apiClient } from './api-client';

export const pushService = {
  async registerToken(token: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/push/expo-token', { token });
  },

  async removeToken(token: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>('/push/expo-token', { token });
  },
};
```

Note: `apiClient.delete`는 현재 body를 지원하지 않음. Body가 필요한 DELETE 요청을 위해 `apiClient`에 `deleteWithBody` 메서드를 추가하거나, DELETE 대신 `POST /push/expo-token/remove`로 변경할 수 있다. 권장: `DELETE` + request body 패턴. `apiClient.delete`에 optional body 파라미터를 추가한다.

### 3. Modified: `_layout.tsx` (Root Layout)

알림 리스너를 앱 최상위에서 등록.

```typescript
// app/_layout.tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';

function RootNavigator(): React.JSX.Element {
  const { isLoggedIn, isLoading } = useAuth();

  // 로그인 상태에서만 푸시 초기화
  usePushNotifications({ enabled: isLoggedIn });

  // ... 기존 렌더링 로직
}
```

### 4. Modified: `settings.tsx` -- 푸시 알림 토글 추가

```
┌─ 푸시 알림 ───────────────────────────────────┐
│  알림 받기                           [Toggle]  │
│  날씨, 교통 알림을 푸시로 받습니다.             │
│                                               │
│  (토글 OFF 시)                                │
│  알림을 끄면 카카오 알림톡으로만 발송됩니다.     │
└───────────────────────────────────────────────┘
```

토글 상태는 `usePushNotifications` 훅의 `isEnabled`와 연동.

### 5. Modified: `AuthContext.tsx` -- 로그아웃 시 토큰 cleanup

```typescript
const logout = useCallback(async (): Promise<void> => {
  if (isLoggingOut.current) return;
  isLoggingOut.current = true;

  try {
    // NEW: 푸시 토큰 해제 (서버에 삭제 요청)
    await cleanupPushToken();  // push.service.removeToken(storedToken)
    await tokenService.clearAll();
    setUser(null);
  } finally {
    isLoggingOut.current = false;
  }
}, []);
```

### 6. New npm dependencies

```bash
cd mobile && npx expo install expo-notifications expo-device expo-constants
```

### 7. Modified: `app.json` -- expo-notifications 플러그인 추가

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6",
          "sounds": []
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

**Required files:**
- `google-services.json` (Firebase Console에서 다운로드) -- Android FCM
- iOS: Expo EAS Build에서 APNs 키 설정 (eas.json 또는 Expo Dashboard)

---

## Integration Points with Existing Notification System

### 발송 흐름 (변경 후)

```
EventBridge Scheduler (cron)
  |
  v
POST /scheduler/trigger/:alertId
  |
  v
SendNotificationUseCase.execute(alertId)
  |
  +-- 데이터 수집 (날씨, 미세먼지, 교통, 경로)
  |
  +-- Solapi 알림톡 발송 (메인 채널, 전화번호 기반)
  |     |
  |     +-- 성공 -> 로그 저장
  |     +-- 실패 -> fallback (레거시 템플릿)
  |
  +-- Web Push 발송 (보조 채널, PWA용) -- fire & forget
  |     |
  |     +-- WebPushService.sendToUser(userId) -- platform='web'만 조회
  |
  +-- Expo Push 발송 (보조 채널, 네이티브 앱용) -- fire & forget  <- NEW
        |
        +-- ExpoPushService.sendToUser(userId) -- platform='expo'만 조회
```

### 핵심 원칙

1. **독립 발송**: Solapi, Web Push, Expo Push는 서로 독립. 하나가 실패해도 다른 채널에 영향 없음.
2. **Fire-and-forget**: Web Push와 Expo Push는 비동기 fire-and-forget. 메인 알림(Solapi) 성공 여부와 무관.
3. **동일 데이터**: 세 채널 모두 같은 `logSummary` (메시지 빌더가 생성한 요약)를 전달.
4. **B-7 지연 감지 알림**: 기존 지하철 지연 감지 시 Web Push로만 보내던 것을 Expo Push에도 동시 발송.

### B-7 지연 알림 확장

```typescript
// SendNotificationUseCase.collectTransitData() 내
if (delayInfo) {
  this.sendDelayAlert(alert, delayInfo, data).catch(err =>
    this.logger.warn(`Delay alert push failed: ${err}`),
  );
  // NEW: Expo Push로도 지연 알림 발송
  this.sendDelayAlertExpo(alert, delayInfo, data).catch(err =>
    this.logger.warn(`Delay alert expo push failed: ${err}`),
  );
}
```

---

## Edge Cases

### 1. Permission Denied (사용자가 푸시 권한 거부)

**Scenario:** 사용자가 OS 다이얼로그에서 "허용 안 함" 선택.

**Handling:**
- `Notifications.getPermissionsAsync()` 결과가 `denied`
- 토큰 획득하지 않음, 서버에 등록 요청 보내지 않음
- 설정 탭에서 토글을 OFF로 표시
- 토글 ON 시도 시: "시스템 설정에서 알림을 허용해주세요" 메시지 + `Linking.openSettings()` 버튼 제공
- **구현 안 하는 것**: OS 설정 변경 감지 (AppState 포커스 복귀 시 재체크만)

### 2. Token Refresh (토큰 갱신)

**Scenario:** Expo Push Token은 앱 업데이트, OS 업데이트, 앱 재설치 시 변경될 수 있음.

**Handling:**
- 앱 시작 시 매번 `getExpoPushTokenAsync()` 호출
- 이전에 저장한 토큰과 비교 (`SecureStore`에 마지막 등록 토큰 저장)
- 토큰이 변경되었으면:
  1. `DELETE /push/expo-token` (이전 토큰)
  2. `POST /push/expo-token` (새 토큰)
- 토큰이 동일하면 서버 호출 생략 (불필요한 API 호출 방지)
- 저장 위치: `expo-secure-store`의 `push_expo_token` 키

### 3. Logout Cleanup (로그아웃 시 정리)

**Scenario:** 사용자가 로그아웃하면 해당 디바이스의 Expo 토큰을 서버에서 삭제해야 함.

**Handling:**
- `AuthContext.logout()` 에서 `pushService.removeToken(storedToken)` 호출
- `SecureStore`에서 `push_expo_token` 삭제
- 네트워크 에러 시: 무시 (서버 사이드에서 만료 토큰은 발송 시 자동 정리됨)
- JWT 만료 상태에서 로그아웃 시: DELETE 요청이 401을 반환할 수 있음. try-catch로 무시.

### 4. Multiple Devices (복수 디바이스)

**Scenario:** 한 사용자가 iPhone + Android 두 대에 앱 설치.

**Handling:**
- 각 디바이스가 고유한 Expo Push Token을 가짐
- `push_subscriptions` 테이블에 같은 `userId`로 여러 `platform='expo'` 레코드 존재 가능
- `ExpoPushService.sendToUser()`가 모든 expo 구독을 조회하여 각각 발송
- `endpoint` unique 인덱스가 토큰 중복 방지

### 5. Device Transfer (디바이스 양도 / 다른 계정 로그인)

**Scenario:** A 사용자가 로그아웃하고 B 사용자가 같은 디바이스에 로그인.

**Handling:**
- B가 로그인 -> `POST /push/expo-token` -> 같은 `endpoint`(토큰)이 이미 존재
- 서버에서 해당 레코드의 `userId`를 B로 업데이트 (upsert)
- A에게는 더 이상 해당 디바이스로 알림이 가지 않음
- A가 로그아웃 시 `DELETE /push/expo-token` 호출도 하지만, 이미 B의 것이므로 `userId` 불일치로 삭제 안 됨 (안전)

### 6. Expo Push Token Expiration (토큰 만료)

**Scenario:** Expo Push Token이 만료되거나 앱 삭제 시 발송 실패.

**Handling:**
- `expo-server-sdk`의 `sendPushNotificationsAsync()` 결과에서 에러 코드 확인
- `DeviceNotRegistered` -> 해당 구독 레코드 `DELETE` (Web Push의 410/404 처리와 동일 패턴)
- `MessageTooBig`, `InvalidCredentials` -> 로깅만 (재시도 불필요)
- `MessageRateExceeded` -> 로깅 + 다음 발송 시 재시도

### 7. App in Foreground (앱 활성 상태에서 알림 수신)

**Scenario:** 사용자가 앱을 보고 있을 때 알림이 도착.

**Handling:**
- `Notifications.setNotificationHandler()` 설정:
  ```typescript
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,   // 포그라운드에서도 알림 배너 표시
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  ```
- OS 기본 알림 배너가 상단에 표시됨 (커스텀 인앱 UI 불필요 -- 이번 사이클)

### 8. Network Failure During Token Registration

**Scenario:** 토큰 획득은 성공했으나 서버 등록 API 호출 실패.

**Handling:**
- 토큰을 `SecureStore`에 `pending_push_token`으로 저장
- 다음 앱 시작 시 pending 토큰이 있으면 재등록 시도
- 3회 연속 실패 시 포기하고 pending 토큰 삭제 (다음 앱 시작 시 새 토큰으로 재시도)

### 9. Simulator / Emulator (개발 환경)

**Scenario:** iOS 시뮬레이터에서는 푸시 토큰을 받을 수 없음.

**Handling:**
- `Device.isDevice` 체크 -> false면 토큰 등록 건너뜀
- `__DEV__` 모드에서 콘솔 경고: "Push notifications require a physical device"
- 시뮬레이터에서 설정 토글은 표시하되, 활성화 시 안내 메시지 표시

---

## Acceptance Criteria

### Must (반드시 통과)

- [ ] Given 로그인 상태의 사용자가 앱을 최초 실행, When OS 푸시 권한 다이얼로그가 표시되고 "허용"을 누르면, Then Expo Push Token이 서버 `push_subscriptions` 테이블에 `platform='expo'`로 저장된다.
- [ ] Given 서버에 Expo Push Token이 등록된 사용자, When EventBridge가 알림을 트리거하면, Then 해당 사용자의 모든 expo 디바이스에 네이티브 푸시 알림이 도착한다.
- [ ] Given 앱이 백그라운드인 상태에서 푸시 알림을 수신, When 사용자가 알림을 탭하면, Then 앱이 포그라운드로 전환되고 알림의 `url` 데이터에 해당하는 화면으로 이동한다.
- [ ] Given 앱이 포그라운드인 상태에서 푸시 알림을 수신, When 알림이 도착하면, Then 화면 상단에 알림 배너가 표시된다.
- [ ] Given 로그인 상태의 사용자가 로그아웃, When 로그아웃이 완료되면, Then 해당 디바이스의 Expo Push Token이 서버에서 삭제된다.
- [ ] Given Expo Push 발송이 실패, When 기존 Solapi 알림톡은 정상 발송, Then 사용자는 알림톡으로 정상적으로 알림을 받는다 (Expo 실패가 다른 채널에 영향을 주지 않는다).
- [ ] Given 기존 Web Push 구독이 있는 PWA 사용자, When `platform` 컬럼이 추가된 후에도, Then 기존 Web Push가 정상 동작한다 (`platform='web'` 기본값 적용).
- [ ] Given TypeScript 프로젝트 전체, When `tsc --noEmit`을 실행하면, Then 에러 0개.

### Should (강력 권장)

- [ ] Given 설정 탭, When 사용자가 "푸시 알림" 토글을 OFF로 변경하면, Then `DELETE /push/expo-token`이 호출되고 더 이상 Expo Push를 받지 않는다.
- [ ] Given 앱 업데이트 후 Expo Push Token이 변경, When 앱을 다시 실행하면, Then 이전 토큰이 삭제되고 새 토큰이 자동 등록된다.
- [ ] Given 만료된 Expo Push Token으로 발송 시도, When `DeviceNotRegistered` 에러가 반환되면, Then 해당 토큰이 `push_subscriptions`에서 자동 삭제된다.
- [ ] Given OS 푸시 권한을 거부한 사용자, When 설정 탭에서 토글 ON을 시도하면, Then "시스템 설정에서 알림을 허용해주세요" 안내가 표시된다.

### Could (시간 허용 시)

- [ ] Given 알림 발송 로그, When notification_logs 테이블을 조회하면, Then 채널 구분(solapi/web_push/expo_push)이 기록되어 있다.

---

## Task Breakdown

### Backend Tasks

| # | Task | Size | Deps | Description |
|---|------|:----:|------|-------------|
| B1 | `push_subscriptions` 엔티티에 `platform` 컬럼 추가 | S | none | Entity에 `platform` 필드 추가, 기존 데이터 기본값 `'web'` |
| B2 | `WebPushService` platform 필터 추가 | S | B1 | `sendToUser`에서 `platform: 'web'` 조건 추가 |
| B3 | `expo-server-sdk` 설치 + `ExpoPushService` 구현 | M | B1 | IExpoPushService 인터페이스 + 구현 + NoopExpoPushService |
| B4 | `PushController`에 expo-token 엔드포인트 추가 | M | B1 | POST/DELETE `/push/expo-token` + DTO validation |
| B5 | `SendNotificationUseCase`에 Expo Push 발송 연결 | S | B3 | `sendExpoPush` 메서드 추가, execute에서 호출 |
| B6 | `PushModule` 업데이트 | S | B3, B4 | ExpoPushService provider + export 추가 |
| B7 | B-7 지연 알림 Expo Push 확장 | S | B5 | `sendDelayAlert`와 동일 패턴으로 Expo Push 발송 |
| B8 | 백엔드 단위 테스트 | M | B3, B4, B5 | ExpoPushService, PushController expo-token, UseCase 통합 테스트 |

### Frontend (Mobile) Tasks

| # | Task | Size | Deps | Description |
|---|------|:----:|------|-------------|
| F1 | `expo-notifications` + `expo-device` + `expo-constants` 설치 | S | none | npx expo install + app.json 플러그인 설정 |
| F2 | `push.service.ts` 생성 | S | none | registerToken / removeToken API 함수 |
| F3 | `apiClient.delete` body 지원 추가 | S | none | DELETE 요청에 request body 전달 가능하도록 |
| F4 | `usePushNotifications` 훅 구현 | L | F1, F2 | 권한 요청, 토큰 관리, 리스너 등록, enable/disable |
| F5 | Root `_layout.tsx`에 푸시 초기화 연결 | S | F4 | usePushNotifications 호출 추가 |
| F6 | 설정 탭 푸시 알림 토글 UI | M | F4 | NotificationSection 컴포넌트, 토글 + 상태 표시 |
| F7 | `AuthContext` 로그아웃 시 토큰 cleanup | S | F2 | logout 함수에 pushService.removeToken 호출 추가 |
| F8 | 알림 탭 딥링크 처리 | S | F4 | notification response listener -> router.push(url) |
| F9 | 프론트엔드 수동 테스트 (물리 디바이스) | M | F5, F6, F7, F8 | 전체 플로우 E2E 검증 |

### Infra / Config Tasks

| # | Task | Size | Deps | Description |
|---|------|:----:|------|-------------|
| I1 | Firebase 프로젝트 생성 + `google-services.json` 준비 | S | none | Android FCM 설정 |
| I2 | APNs Key 등록 (Expo Dashboard 또는 eas.json) | S | none | iOS 푸시 설정 |
| I3 | SSM에 필요한 시크릿 추가 (있다면) | S | none | Expo 관련 환경변수 확인 |

### Dependency Graph

```
B1 ─┬─> B2
    ├─> B3 ──> B5 ──> B7
    └─> B4        ╲
                    B6 ──> B8

F1 ──> F4 ──> F5
F2 ──╱      ╲─> F6
F3 ──╱       ╲─> F8
               F7 (parallel)

I1, I2, I3 (parallel, before F9)
```

---

## Open Questions

1. **Expo Project ID**: `getExpoPushTokenAsync()`에 `projectId`가 필요. `expo-constants`의 `Constants.expoConfig?.extra?.eas?.projectId`로 자동 획득 가능한지, 아니면 `app.json`에 명시적으로 설정해야 하는지 확인 필요.

2. **Firebase 프로젝트**: Android FCM을 위해 Firebase 프로젝트가 필요. 기존 Firebase 프로젝트가 있는지, 새로 만들어야 하는지 확인.

3. **APNs 인증 방식**: APNs Key (.p8) vs APNs Certificate (.p12). Expo는 Key 방식을 권장하며 EAS Build에서 자동 관리 가능. 현재 Apple Developer 계정에 Key가 생성되어 있는지 확인 필요.

4. **Expo Push Token의 projectId**: `expo-server-sdk`로 발송 시 Expo 프로젝트 인증이 별도로 필요한지. (Expo Push은 토큰 자체에 프로젝트 정보가 포함되어 있어 별도 인증 없이 발송 가능한 것으로 파악, 확인 필요.)

5. **apiClient.delete body 지원**: REST 표준에서 DELETE body는 비표준이지만 널리 사용됨. 대안으로 `POST /push/expo-token/remove`를 사용할 수도 있음. 팀 컨벤션에 따라 결정.

---

## Out of Scope

- **Rich Notifications (이미지, 액션 버튼)**: Phase 2에서 검토. 현재는 텍스트 알림만.
- **Local Notifications (로컬 예약)**: 서버에서 발송하는 구조이므로 로컬 알림 불필요.
- **Silent Push (백그라운드 데이터 갱신)**: 위젯 데이터 갱신은 Phase 2의 위젯 구현 시 검토.
- **알림 히스토리 인앱 목록에 Push 채널 구분 표시**: 기존 notification_logs로 충분.
- **A/B 테스트 (알림톡 vs 푸시 vs 양쪽)**: 사용자 수가 충분해진 후 Phase 3에서 검토.
- **Android Notification Channel 커스터마이징**: Expo 기본 채널로 충분. 필요 시 Phase 2.
- **Rate Limiting**: Expo Push는 기본적으로 Expo 서버가 rate limit 관리. 별도 구현 불필요.
