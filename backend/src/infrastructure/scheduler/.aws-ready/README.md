# AWS EventBridge Scheduler 전환 가이드

이 폴더에는 AWS EventBridge Scheduler 전환에 필요한 파일들이 있습니다.

## 현재 상태

- **eventbridge-scheduler.service.ts**: AWS SDK 의존성으로 인해 분리됨
- 현재 시스템은 `InMemoryNotificationSchedulerService` 사용

## AWS 전환 단계

### 1. AWS SDK 설치

```bash
cd backend
npm install @aws-sdk/client-scheduler @aws-sdk/client-sqs
```

### 2. EventBridge Scheduler 서비스 활성화

```bash
# 파일 이동
mv src/infrastructure/scheduler/.aws-ready/eventbridge-scheduler.service.ts \
   src/infrastructure/scheduler/
```

### 3. scheduler.module.ts 수정

`scheduler.module.ts`에서 AWS 관련 코드 주석 해제:

```typescript
if (isAWSEnabled) {
  try {
    const { EventBridgeSchedulerService } = require('./eventbridge-scheduler.service');
    logger.log('Using EventBridge Scheduler (AWS)');
    return {
      module: SchedulerModule,
      providers: [
        { provide: 'INotificationScheduler', useClass: EventBridgeSchedulerService },
        EventBridgeSchedulerService,
      ],
      exports: ['INotificationScheduler'],
    };
  } catch {
    logger.warn('AWS SDK not installed, falling back to InMemory');
  }
}
```

### 4. 환경 변수 설정

```env
# AWS 설정
AWS_REGION=ap-northeast-2
AWS_SCHEDULER_ENABLED=true
SCHEDULE_GROUP_NAME=alert-system-prod-alerts
SCHEDULER_ROLE_ARN=arn:aws:iam::xxx:role/alert-system-prod-scheduler-role
API_ENDPOINT=https://your-api.com/scheduler/trigger
SCHEDULER_DLQ_ARN=arn:aws:sqs:ap-northeast-2:xxx:alert-system-prod-scheduler-dlq
SCHEDULER_SECRET=your-scheduler-secret
```

### 5. Terraform 인프라 배포

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

## 관련 문서

- [infra/DEPLOYMENT_GUIDE.md](../../../../infra/DEPLOYMENT_GUIDE.md) - 전체 AWS 배포 가이드
- [infra/terraform/](../../../../infra/terraform/) - Terraform 모듈
