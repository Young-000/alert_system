# 아키텍처 질문 답변

## 1. Push Notification은 어떤 방식인가요?

### ✅ 웹 푸시 (Web Push) 방식입니다

현재 구현은 **웹 브라우저 기반 푸시 알림**입니다. 모바일 네이티브 앱 푸시가 아닙니다.

### 구현 방식
- **기술 스택**: Web Push API + Service Worker
- **라이브러리**: `web-push` (Node.js)
- **프로토콜**: VAPID (Voluntary Application Server Identification)

### 작동 방식
1. 사용자가 웹 브라우저에서 알림 권한 허용
2. Service Worker 등록 (`/sw.js`)
3. Push Subscription 생성 (endpoint + keys)
4. 백엔드에 Subscription 저장
5. 백엔드에서 `web-push`로 알림 전송
6. 브라우저가 알림 표시

### 지원 환경
- ✅ 데스크톱 브라우저 (Chrome, Firefox, Edge, Safari)
- ✅ 모바일 브라우저 (Android Chrome, iOS Safari 16.4+)
- ✅ PWA (Progressive Web App)로 설치 가능

### 모바일 네이티브 앱 푸시와의 차이
| 구분 | 웹 푸시 (현재) | 모바일 앱 푸시 |
|------|---------------|---------------|
| 설치 | 브라우저만 있으면 됨 | 앱 스토어 설치 필요 |
| 플랫폼 | 크로스 플랫폼 | iOS/Android 별도 구현 |
| 제한 | 브라우저가 열려있어야 함 | 백그라운드에서도 동작 |
| 구현 난이도 | 낮음 | 높음 (FCM, APNS 설정 필요) |

### 현재 코드 위치
- **백엔드**: `backend/src/infrastructure/push/push-notification.service.ts`
- **프론트엔드**: `frontend/public/sw.js` (Service Worker)
- **프론트엔드 Hook**: `frontend/src/presentation/hooks/usePushNotification.ts`

---

## 2. 스케줄러는 개인별로 원하는 타이밍을 입력하고 받는 형태인가요?

### ✅ 네, 맞습니다!

개인별로 원하는 타이밍을 입력하고, 그에 맞게 알림을 받을 수 있도록 구현되어 있습니다.

### 구현 방식

#### 1. 스케줄 저장 (DB)
- **테이블**: `alerts`
- **필드**: `schedule` (Cron 패턴 문자열)
- **예시**: `"0 8 * * *"` (매일 오전 8시)

```typescript
// Alert 엔티티
export class Alert {
  public readonly schedule: string;  // Cron 패턴
  public readonly userId: string;     // 개인별 구분
  // ...
}
```

#### 2. 스케줄 입력 방식
- **Cron 패턴** 형식으로 입력
- **형식**: `분 시 일 월 요일`
- **예시**:
  - `"0 8 * * *"` - 매일 오전 8시
  - `"0 18 * * 1-5"` - 평일 오후 6시
  - `"30 7 * * *"` - 매일 오전 7시 30분

#### 3. 스케줄 실행 (BullMQ)
- **큐 시스템**: BullMQ (Redis 기반)
- **반복 작업**: Cron 패턴에 따라 자동 반복 실행
- **개인별 관리**: 각 Alert마다 독립적인 스케줄

```typescript
// NotificationSchedulerService
async scheduleNotification(alert: Alert): Promise<void> {
  await this.queue.add(
    'send-notification',
    { alertId: alert.id },
    {
      repeat: {
        pattern: alert.schedule,  // 개인별 스케줄 사용
      },
      jobId: `alert-${alert.id}`,  // 개인별 고유 ID
    }
  );
}
```

### DB 저장 구조

```sql
-- alerts 테이블
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,        -- 개인 구분
  name VARCHAR NOT NULL,
  schedule VARCHAR NOT NULL,     -- 개인별 스케줄 (Cron 패턴)
  alert_types JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  bus_stop_id VARCHAR,
  subway_station_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 사용자 시나리오

1. **사용자 A**: 매일 오전 8시 출근 알림
   ```json
   {
     "userId": "user-a-id",
     "schedule": "0 8 * * *",
     "alertTypes": ["weather", "airQuality"]
   }
   ```

2. **사용자 B**: 평일 오후 6시 퇴근 알림
   ```json
   {
     "userId": "user-b-id",
     "schedule": "0 18 * * 1-5",
     "alertTypes": ["bus", "subway"]
   }
   ```

3. **사용자 C**: 매일 오전 7시 30분 알림
   ```json
   {
     "userId": "user-c-id",
     "schedule": "30 7 * * *",
     "alertTypes": ["weather"]
   }
   ```

### 현재 구현 상태

✅ **완료된 부분**:
- Alert 생성 시 스케줄 저장 (DB)
- Cron 패턴 검증 (DTO 레벨)
- 스케줄러 서비스 구현

⚠️ **미완성 부분**:
- Alert 생성 시 자동 스케줄링 (현재 수동 호출 필요)
- Alert 수정 시 스케줄 업데이트
- Alert 삭제 시 스케줄 취소

### 필요한 추가 작업

```typescript
// AlertController에서 Alert 생성 시 자동 스케줄링
@Post()
async create(@Body() createAlertDto: CreateAlertDto) {
  const alert = await this.createAlertUseCase.execute(createAlertDto);
  await this.schedulerService.scheduleNotification(alert);  // 추가 필요
  return alert;
}
```

---

## 3. 현재 DB는 어떻게 사용하고 있나요?

### 데이터베이스: PostgreSQL

#### 사용 방식
- **로컬**: PostgreSQL 직접 연결
- **클라우드**: Supabase (관리형 PostgreSQL)

#### 환경 변수로 자동 전환
```typescript
// SUPABASE_URL이 있으면 Supabase, 없으면 로컬
url: process.env.SUPABASE_URL || undefined,
host: process.env.SUPABASE_URL ? undefined : 'localhost',
```

### 테이블 구조

#### 1. `users` 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  location JSONB,  -- { address, lat, lng }
  created_at TIMESTAMP DEFAULT NOW()
);
```

**용도**: 사용자 정보 저장
- 이메일, 이름
- 위치 정보 (날씨/미세먼지 조회용)

#### 2. `alerts` 테이블
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR NOT NULL,
  schedule VARCHAR NOT NULL,        -- Cron 패턴
  alert_types JSONB NOT NULL,       -- ["weather", "airQuality"]
  enabled BOOLEAN DEFAULT true,
  bus_stop_id VARCHAR,
  subway_station_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**용도**: 개인별 알림 설정 저장
- 사용자별 알림 목록
- 스케줄 정보 (Cron 패턴)
- 알림 타입 (날씨, 미세먼지, 버스, 지하철)
- 버스/지하철 정류장 ID

#### 3. `push_subscriptions` 테이블
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,  -- { p256dh, auth }
  created_at TIMESTAMP DEFAULT NOW()
);
```

**용도**: 웹 푸시 구독 정보 저장
- 사용자별 푸시 구독 정보
- 브라우저별 고유 endpoint
- 암호화 키

### 데이터 흐름

#### Alert 생성 흐름
```
1. 사용자가 프론트엔드에서 알림 설정
   ↓
2. POST /alerts { userId, schedule, alertTypes }
   ↓
3. CreateAlertUseCase 실행
   ↓
4. DB에 alerts 테이블에 저장
   ↓
5. (미완성) NotificationSchedulerService로 스케줄 등록
```

#### 알림 전송 흐름
```
1. BullMQ 스케줄러가 시간 도래 감지
   ↓
2. send-notification 작업 실행
   ↓
3. SendNotificationUseCase 실행
   ↓
4. DB에서 alert 조회
   ↓
5. DB에서 user 조회 (위치 정보)
   ↓
6. 외부 API 호출 (날씨, 미세먼지 등)
   ↓
7. DB에서 push_subscriptions 조회
   ↓
8. PushNotificationService로 알림 전송
```

### 현재 DB 사용 현황

#### ✅ 저장되는 데이터
- 사용자 정보 (users)
- 알림 설정 (alerts) - 스케줄 포함
- 푸시 구독 정보 (push_subscriptions) - 엔티티만 있고 저장 로직 미완성

#### ⚠️ 미완성 부분
- Alert 생성 시 자동 스케줄링 (DB에는 저장되지만 큐에 등록 안됨)
- Alert 수정/삭제 시 스케줄 업데이트/취소
- Push Subscription 저장 (NotificationController에 TODO)

### 필요한 추가 작업

1. **Alert 생성 시 자동 스케줄링**
   ```typescript
   // AlertController.create()에서
   const alert = await this.createAlertUseCase.execute(dto);
   await this.schedulerService.scheduleNotification(alert);
   ```

2. **Push Subscription 저장**
   ```typescript
   // NotificationController.subscribe()에서
   await this.pushSubscriptionRepository.save(subscription);
   ```

3. **Alert 수정/삭제 시 스케줄 관리**
   ```typescript
   // Alert 수정 시
   await this.schedulerService.cancelNotification(alertId);
   await this.schedulerService.scheduleNotification(updatedAlert);
   
   // Alert 삭제 시
   await this.schedulerService.cancelNotification(alertId);
   ```

---

## 요약

### 1. Push Notification
- ✅ **웹 푸시** 방식 (모바일 앱 푸시 아님)
- ✅ 브라우저에서 동작
- ✅ PWA로 설치 가능

### 2. 스케줄러
- ✅ **개인별 스케줄** 입력 가능 (Cron 패턴)
- ✅ **DB에 저장**됨 (alerts 테이블)
- ⚠️ Alert 생성 시 자동 스케줄링 미완성

### 3. DB 사용
- ✅ **PostgreSQL** 사용 (Supabase 또는 로컬)
- ✅ **3개 테이블**: users, alerts, push_subscriptions
- ⚠️ Push Subscription 저장 로직 미완성
