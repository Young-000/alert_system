# Cron 실행 메커니즘

## 현재 구현 상태

### ⚠️ 문제: Worker가 없습니다!

현재 코드를 확인한 결과:
- ✅ 스케줄러 서비스는 있음 (`NotificationSchedulerService`)
- ✅ BullMQ 큐 설정은 있음 (`QueueModule`)
- ❌ **Worker/Processor가 없음** - 실제로 작업을 처리하는 부분이 없습니다!

---

## Cron 실행 흐름 (현재 구조)

### 1. 스케줄 등록 (구현됨)

```typescript
// NotificationSchedulerService
async scheduleNotification(alert: Alert): Promise<void> {
  await this.queue.add(
    'send-notification',
    { alertId: alert.id },
    {
      repeat: {
        pattern: alert.schedule,  // Cron 패턴 (예: "0 8 * * *")
      },
      jobId: `alert-${alert.id}`,
    }
  );
}
```

**동작**: BullMQ 큐에 반복 작업을 등록합니다.

### 2. 스케줄 실행 (❌ 미구현)

**현재 상태**: Worker가 없어서 실제로 실행되지 않습니다!

---

## BullMQ Cron 실행 원리

### BullMQ의 Repeat 기능

BullMQ는 내장된 Cron 스케줄러를 사용합니다:

```typescript
{
  repeat: {
    pattern: "0 8 * * *",  // Cron 패턴
  }
}
```

**동작 방식**:
1. BullMQ가 Cron 패턴을 파싱
2. 다음 실행 시간 계산
3. Redis에 스케줄 저장
4. 시간이 되면 자동으로 작업을 큐에 추가
5. **Worker가 작업을 처리** ← 이 부분이 없음!

---

## 필요한 구현: Worker/Processor

### NestJS BullMQ Worker 패턴

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('notifications')  // 큐 이름
export class NotificationProcessor extends WorkerHost {
  constructor(
    private sendNotificationUseCase: SendNotificationUseCase
  ) {
    super();
  }

  async process(job: Job<{ alertId: string }>): Promise<void> {
    const { alertId } = job.data;
    await this.sendNotificationUseCase.execute(alertId);
  }
}
```

---

## 전체 실행 흐름 (구현 후)

```
┌─────────────────────────────────────────┐
│ 1. Alert 생성                           │
│    POST /alerts                         │
│    { schedule: "0 8 * * *" }           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. DB에 저장                            │
│    alerts 테이블 INSERT                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 3. BullMQ 큐에 스케줄 등록              │
│    NotificationSchedulerService        │
│    .scheduleNotification(alert)        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 4. Redis에 스케줄 저장                  │
│    BullMQ가 Cron 패턴 파싱              │
│    다음 실행 시간 계산                  │
└──────────────┬──────────────────────────┘
               │
               ▼ (시간 경과)
┌─────────────────────────────────────────┐
│ 5. BullMQ가 작업을 큐에 추가            │
│    자동으로 'send-notification' 작업   │
│    { alertId: "..." }                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 6. Worker가 작업 처리 (❌ 미구현)        │
│    NotificationProcessor                │
│    .process(job)                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 7. SendNotificationUseCase 실행         │
│    - Alert 조회                        │
│    - User 조회                         │
│    - 외부 API 호출                     │
│    - Push 전송                         │
└─────────────────────────────────────────┘
```

---

## 구현 방법

### Step 1: Processor 생성

```typescript
// backend/src/infrastructure/queue/notification.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  constructor(
    @Inject(SendNotificationUseCase)
    private sendNotificationUseCase: SendNotificationUseCase
  ) {
    super();
  }

  async process(job: Job<{ alertId: string }>): Promise<void> {
    console.log(`Processing notification job: ${job.id}`);
    const { alertId } = job.data;
    
    try {
      await this.sendNotificationUseCase.execute(alertId);
      console.log(`Notification sent successfully for alert: ${alertId}`);
    } catch (error) {
      console.error(`Failed to send notification for alert ${alertId}:`, error);
      throw error; // BullMQ가 자동으로 재시도
    }
  }
}
```

### Step 2: QueueModule에 Processor 등록

```typescript
// backend/src/infrastructure/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationModule } from '@presentation/modules/notification.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    NotificationModule, // SendNotificationUseCase 의존성 주입을 위해
  ],
  providers: [
    NotificationSchedulerService,
    NotificationProcessor,  // 추가
  ],
  exports: [NotificationSchedulerService, BullModule],
})
export class QueueModule {}
```

### Step 3: Alert 생성 시 자동 스케줄링

```typescript
// backend/src/presentation/controllers/alert.controller.ts
@Post()
async create(@Body() createAlertDto: CreateAlertDto) {
  const alert = await this.createAlertUseCase.execute(createAlertDto);
  
  // 자동 스케줄링 추가
  await this.schedulerService.scheduleNotification(alert);
  
  return alert;
}
```

---

## 실행 위치

### 서버 내부에서 실행

**Worker는 백엔드 서버 프로세스 내에서 실행됩니다.**

```
┌─────────────────────────────────┐
│   NestJS 백엔드 서버             │
│                                 │
│  ┌──────────────────────────┐  │
│  │  API 서버 (Express)       │  │
│  │  - HTTP 요청 처리         │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  BullMQ Worker            │  │
│  │  - 큐 모니터링            │  │
│  │  - 작업 처리              │  │
│  │  - Cron 실행              │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Redis                         │
│   - 스케줄 저장                 │
│   - 큐 관리                     │
└─────────────────────────────────┘
```

### 별도 프로세스로 실행 (선택사항)

Worker를 별도 프로세스로 분리할 수도 있습니다:

```typescript
// worker.ts (별도 파일)
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  // Worker만 실행 (HTTP 서버 없음)
}
bootstrap();
```

---

## Cron 패턴 예시

### BullMQ Cron 형식

```
분 시 일 월 요일
*  *  *  *  *
│  │  │  │  │
│  │  │  │  └─ 요일 (0-6, 0=일요일)
│  │  │  └─── 월 (1-12)
│  │  └─────── 일 (1-31)
│  └────────── 시 (0-23)
└────────────── 분 (0-59)
```

### 예시

```typescript
"0 8 * * *"      // 매일 오전 8시
"0 18 * * 1-5"   // 평일 오후 6시
"30 7 * * *"     // 매일 오전 7시 30분
"0 9,18 * * *"   // 매일 오전 9시, 오후 6시
"0 */2 * * *"    // 매 2시간마다
"*/15 * * * *"   // 매 15분마다
```

---

## 현재 문제점

### ❌ Worker가 없어서 실행되지 않음

**증상**:
- Alert 생성 시 스케줄은 등록됨
- 하지만 실제로 알림이 전송되지 않음
- Redis에는 스케줄이 저장되지만 처리되지 않음

**해결책**:
- `NotificationProcessor` 구현 필요
- `QueueModule`에 등록 필요

---

## 테스트 방법

### 1. 스케줄 등록 확인

```bash
# Redis CLI로 확인
redis-cli
> KEYS bull:notifications:*
> GET bull:notifications:repeat:*
```

### 2. Worker 동작 확인

```bash
# 로그 확인
# Worker가 작업을 처리하면 로그가 출력됨
```

### 3. 즉시 테스트

```typescript
// 테스트용: 즉시 실행
await this.queue.add('send-notification', { alertId: 'test-id' });
```

---

## 요약

### 현재 상태
- ✅ 스케줄 등록: 구현됨
- ❌ 작업 처리: **Worker 없음**

### 필요한 작업
1. `NotificationProcessor` 생성 (30분)
2. `QueueModule`에 등록 (10분)
3. Alert 생성 시 자동 스케줄링 (10분)
4. 테스트 (30분)

**총 소요시간: 약 1-2시간**
