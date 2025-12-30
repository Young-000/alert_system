# Worker란 무엇인가?

## 간단한 비유

### 🏪 편의점 비유

```
┌─────────────────────────────────────┐
│         편의점 시스템                │
├─────────────────────────────────────┤
│                                     │
│  📋 주문서 (Queue)                  │
│  - "오전 8시에 알림 보내기"         │
│  - "오후 6시에 알림 보내기"         │
│                                     │
│  👷 알바생 (Worker)                 │
│  - 주문서를 보고 실제로 일함        │
│  - "오전 8시가 되었네? 알림 보내자!"│
│                                     │
└─────────────────────────────────────┘
```

**Queue (큐)**: 할 일 목록
**Worker**: 실제로 일하는 사람

---

## 현재 상황

### ❌ Worker가 없는 상태

```
┌─────────────────────────────────────┐
│         현재 시스템                  │
├─────────────────────────────────────┤
│                                     │
│  📋 주문서 (Queue)                  │
│  ✅ "오전 8시에 알림 보내기"        │
│  ✅ "오후 6시에 알림 보내기"        │
│                                     │
│  👷 알바생 (Worker)                 │
│  ❌ 없음!                            │
│                                     │
│  결과: 주문서만 쌓이고 아무도 안함   │
└─────────────────────────────────────┘
```

**문제**: 할 일 목록은 쌓이는데, 실제로 일하는 사람이 없어서 아무것도 실행되지 않습니다!

---

## Worker의 역할

### 1. 큐를 모니터링

```typescript
// Worker가 계속 확인
while (true) {
  const job = await queue.getNextJob();  // "할 일 있나?"
  if (job) {
    await processJob(job);  // "있으면 처리하자!"
  }
}
```

### 2. 작업 처리

```typescript
// 실제로 일하는 부분
async processJob(job) {
  const alertId = job.data.alertId;
  
  // 1. DB에서 알림 정보 가져오기
  const alert = await getAlert(alertId);
  
  // 2. 사용자 정보 가져오기
  const user = await getUser(alert.userId);
  
  // 3. 날씨 정보 가져오기
  const weather = await getWeather(user.location);
  
  // 4. 푸시 알림 보내기
  await sendPushNotification(user, weather);
}
```

---

## 전체 시스템 구조

### Worker가 있는 경우

```
┌─────────────────────────────────────────────┐
│           백엔드 서버                        │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  API 서버 (Express)                 │   │
│  │  - 사용자 요청 받기                 │   │
│  │  - "알림 설정해주세요"               │   │
│  │  - DB에 저장                        │   │
│  │  - 큐에 작업 추가                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Worker (백그라운드에서 실행)        │   │
│  │  - 큐를 계속 모니터링               │   │
│  │  - "오전 8시가 되었네?"             │   │
│  │  - 작업 처리: 알림 보내기           │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│           Redis (큐 저장소)                  │
│  - 할 일 목록 저장                          │
│  - 스케줄 정보 저장                         │
└─────────────────────────────────────────────┘
```

---

## 실제 코드 예시

### 현재: Worker 없음

```typescript
// AlertController
@Post()
async create(@Body() dto: CreateAlertDto) {
  const alert = await this.createAlertUseCase.execute(dto);
  
  // 큐에 작업 추가만 함
  await this.queue.add('send-notification', { alertId: alert.id });
  
  // ❌ 하지만 처리하는 사람(Worker)이 없음!
  return alert;
}
```

**결과**: 큐에 작업은 추가되지만, 아무도 처리하지 않음

---

### Worker 추가 후

```typescript
// 1. Worker 생성
@Processor('notifications')  // 'notifications' 큐를 처리
export class NotificationProcessor extends WorkerHost {
  constructor(
    private sendNotificationUseCase: SendNotificationUseCase
  ) {
    super();
  }

  // 2. 작업 처리 함수
  async process(job: Job<{ alertId: string }>): Promise<void> {
    console.log('작업 시작:', job.id);
    
    const { alertId } = job.data;
    
    // 실제로 알림 보내기
    await this.sendNotificationUseCase.execute(alertId);
    
    console.log('작업 완료:', alertId);
  }
}
```

**결과**: Worker가 큐를 모니터링하다가 작업이 있으면 자동으로 처리!

---

## 시간별 동작 예시

### 오전 7시 59분

```
Queue: [작업 대기 중...]
Worker: "할 일 없네, 계속 기다리자"
```

### 오전 8시 00분

```
Queue: [작업 추가됨! "alert-123 알림 보내기"]
Worker: "어? 할 일 생겼네! 처리하자!"
Worker: "DB에서 알림 정보 가져오기..."
Worker: "사용자 정보 가져오기..."
Worker: "날씨 정보 가져오기..."
Worker: "푸시 알림 보내기!"
Worker: "완료! 다음 작업 기다리자"
```

### 오전 8시 01분

```
Queue: [작업 완료됨]
Worker: "할 일 없네, 계속 기다리자"
```

---

## 왜 Worker가 필요한가?

### Worker 없으면

```
사용자: "오전 8시에 알림 보내주세요"
시스템: "네, 알겠습니다" (DB에 저장, 큐에 추가)
        ...
        (오전 8시가 됨)
        ...
시스템: "..." (아무것도 안함)
사용자: "왜 알림이 안 와요?"
```

### Worker 있으면

```
사용자: "오전 8시에 알림 보내주세요"
시스템: "네, 알겠습니다" (DB에 저장, 큐에 추가)
        ...
        (오전 8시가 됨)
        ...
Worker: "오전 8시네! 알림 보내야겠다!"
Worker: "알림 전송 완료!"
사용자: "알림 받았어요!"
```

---

## 다른 비유들

### 📮 우편함 비유

- **Queue**: 우편함 (편지가 들어옴)
- **Worker**: 우편 배달부 (우편함을 확인하고 편지 배달)

### 🍕 피자 주문 비유

- **Queue**: 주문 목록
- **Worker**: 피자 만드는 사람 (주문 받으면 피자 만들기)

### 🎬 영화관 비유

- **Queue**: 예매 목록
- **Worker**: 상영 관리자 (시간 되면 영화 시작)

---

## 기술적 설명

### BullMQ Worker

```typescript
// BullMQ는 내장 Worker를 제공
// 하지만 NestJS에서는 Processor로 구현해야 함

@Processor('notifications')  // 큐 이름
export class NotificationProcessor extends WorkerHost {
  // 이 클래스가 Worker 역할을 함
  
  async process(job: Job): Promise<void> {
    // job: 큐에서 가져온 작업
    // 이 함수가 실제로 작업을 처리함
  }
}
```

### 동작 원리

1. **백그라운드 실행**: Worker는 서버가 시작되면 자동으로 실행됨
2. **지속적 모니터링**: 큐를 계속 확인함
3. **작업 처리**: 작업이 있으면 `process()` 함수 실행
4. **자동 재시도**: 실패하면 자동으로 재시도

---

## 요약

### Worker란?

**할 일 목록(Queue)을 보고 실제로 일하는 백그라운드 프로세스**

### 현재 문제

- ✅ 할 일 목록(Queue)은 있음
- ❌ 일하는 사람(Worker)이 없음
- 결과: 아무것도 실행 안됨

### 해결책

- Worker(Processor) 구현
- 큐 모니터링 및 작업 처리
- 알림 자동 전송

---

## 간단히 말하면

**Worker = 백그라운드에서 자동으로 일하는 프로그램**

예를 들어:
- "오전 8시가 되면 알림 보내기"
- "매일 자정에 데이터 백업하기"
- "주기적으로 외부 API 호출하기"

이런 일들을 자동으로 해주는 것이 Worker입니다!
