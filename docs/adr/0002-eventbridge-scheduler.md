# ADR 0002: EventBridge Scheduler 선택

## 상태
승인됨 (2026-01-28)

## 컨텍스트
사용자별 개인화된 알림(기상, 출근, 퇴근)을 정해진 시간에 발송해야 합니다. 요구사항:

1. 사용자별 개별 스케줄 (예: A는 7시, B는 8시)
2. 서버 재시작 시에도 스케줄 유지
3. 초 단위 정밀도 (cron expression)
4. 스케줄 CRUD 지원

## 결정
AWS EventBridge Scheduler를 선택했습니다.

## 대안 검토

| 옵션 | 장점 | 단점 | 결정 |
|------|------|------|------|
| node-cron (인메모리) | 간단, 무료 | 서버 재시작 시 손실 | ❌ 기각 |
| BullMQ + Redis | 견고함, 재시도 | Redis 비용, 복잡도 | ⚠️ 보류 |
| **EventBridge Scheduler** | 영속, 관리형, API 직접 호출 | AWS 종속 | ✅ 선택 |
| CloudWatch Events | 영속 | 규칙 수 제한 (300개) | ❌ 기각 |

## 근거

1. **영속성**: AWS 관리형 서비스로 스케줄 영구 저장
2. **확장성**: 수백만 개의 스케줄 지원
3. **API 직접 호출**: Lambda 없이 HTTP API 직접 호출 가능
4. **비용 효율**: 스케줄 실행당 과금 (월 수천 회는 무료)

## 구현

```typescript
// 스케줄 생성 예시
await scheduler.createSchedule({
  Name: `alert-${alertId}`,
  GroupName: 'alert-system-prod-alerts',
  ScheduleExpression: 'cron(0 7 * * ? *)', // 매일 7시
  Target: {
    Arn: apiDestinationArn,
    RoleArn: schedulerRoleArn,
    Input: JSON.stringify({ alertId, userId }),
  },
  FlexibleTimeWindow: { Mode: 'OFF' },
});
```

## 결과

### 긍정적
- 서버 재시작 시에도 모든 알림 스케줄 유지
- 관리 콘솔에서 스케줄 상태 확인 가능
- Dead Letter Queue로 실패한 호출 추적

### 부정적
- AWS 종속성 증가
- 로컬 개발 시 모킹 필요

## 참조
- [EventBridge Scheduler 요금](https://aws.amazon.com/eventbridge/pricing/)
