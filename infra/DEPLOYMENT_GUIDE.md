# Alert System - AWS 배포 가이드

## 개요

이 가이드는 Alert System을 AWS 프로덕션 환경에 배포하는 방법을 설명합니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Route 53                                   │
│                         api.yourdomain.com                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Application Load Balancer                           │
│                         (HTTPS 종료)                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           ECS Fargate                                   │
│                    NestJS Backend (Auto Scaling)                        │
└─────────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────────────────┐
│   RDS     │  │ElastiCache│  │EventBridge│  │      CloudWatch         │
│PostgreSQL │  │  Redis    │  │ Scheduler │  │    Monitoring           │
└───────────┘  └───────────┘  └───────────┘  └─────────────────────────┘
```

## 사전 요구사항

1. **AWS CLI** 설치 및 구성
2. **Terraform** >= 1.5.0 설치
3. **Docker** 설치
4. AWS 계정 및 적절한 IAM 권한

## 배포 단계

### 1. AWS 자격 증명 설정

```bash
aws configure
# AWS Access Key ID: [입력]
# AWS Secret Access Key: [입력]
# Default region name: ap-northeast-2
# Default output format: json
```

### 2. ECR 리포지토리 생성

```bash
aws ecr create-repository \
  --repository-name alert-system \
  --region ap-northeast-2
```

### 3. SSM Parameter Store에 시크릿 저장

```bash
# JWT Secret
aws ssm put-parameter \
  --name "/alert-system/prod/jwt-secret" \
  --value "your-super-secret-jwt-key" \
  --type SecureString

# VAPID Private Key
aws ssm put-parameter \
  --name "/alert-system/prod/vapid-private-key" \
  --value "your-vapid-private-key" \
  --type SecureString

# Air Quality API Key
aws ssm put-parameter \
  --name "/alert-system/prod/air-quality-api-key" \
  --value "your-api-key" \
  --type SecureString
```

### 4. Docker 이미지 빌드 및 푸시

```bash
cd backend

# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com

# 빌드
docker build -t alert-system .

# 태그
docker tag alert-system:latest YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com/alert-system:latest

# 푸시
docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com/alert-system:latest
```

### 5. Terraform 변수 설정

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars 파일을 편집하여 값 입력
```

### 6. Terraform 인프라 배포

```bash
# 초기화
terraform init

# 계획 확인
terraform plan

# 배포
terraform apply
```

### 7. 출력 확인

```bash
terraform output

# 예상 출력:
# alb_dns_name = "alert-system-prod-alb-123456789.ap-northeast-2.elb.amazonaws.com"
# cloudwatch_dashboard_url = "https://ap-northeast-2.console.aws.amazon.com/cloudwatch/..."
```

## 환경 변수

### Backend (.env)

```env
# AWS
AWS_REGION=ap-northeast-2
AWS_SCHEDULER_ENABLED=true
SCHEDULE_GROUP_NAME=alert-system-prod-alerts
SCHEDULER_ROLE_ARN=arn:aws:iam::xxx:role/alert-system-prod-scheduler-role
SCHEDULER_SECRET=your-scheduler-secret

# Database (RDS)
DATABASE_URL=postgresql://alert_admin:xxx@alert-system-prod-db.xxx.ap-northeast-2.rds.amazonaws.com:5432/alert_system

# Redis (ElastiCache)
REDIS_URL=redis://alert-system-prod-redis.xxx.cache.amazonaws.com:6379
QUEUE_ENABLED=true

# Application
NODE_ENV=production
PORT=3000
```

## GitHub Actions 설정

### Repository Secrets 추가

1. Repository Settings → Secrets and variables → Actions
2. 다음 시크릿 추가:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

### 자동 배포

`main` 브랜치에 푸시하면 자동으로:
1. 테스트 실행
2. Docker 이미지 빌드 및 ECR 푸시
3. ECS 서비스 업데이트

## 모니터링

### CloudWatch Dashboard

배포 후 출력되는 `cloudwatch_dashboard_url`로 접속하여 모니터링:
- ECS CPU/메모리 사용률
- ALB 요청 수 및 응답 시간
- RDS 성능 지표

### 알람 설정

다음 상황에서 이메일 알림 발송:
- ECS CPU > 80%
- ECS Memory > 80%
- ALB 5XX 에러 > 10개/5분
- RDS CPU > 80%
- RDS 스토리지 < 5GB

## EventBridge Scheduler

### 스케줄 생성 방식

1. 사용자가 알림 생성 (`POST /alerts`)
2. Backend가 EventBridge Scheduler에 스케줄 등록
3. 지정된 시간에 EventBridge가 `POST /scheduler/trigger` 호출
4. Backend가 알림 발송

### 스케줄 형식

```
입력: "0 8 * * 1-5" (평일 오전 8시)
변환: "cron(0 8 ? * MON-FRI *)" (EventBridge 형식)
```

## 비용 예상

| 서비스 | 월 비용 (예상) |
|--------|----------------|
| ECS Fargate (2 tasks) | ~$30 |
| ALB | ~$20 |
| RDS (db.t4g.micro, Multi-AZ) | ~$30 |
| ElastiCache (cache.t4g.micro) | ~$25 |
| EventBridge Scheduler | $0 |
| CloudWatch | ~$10 |
| **총합** | **~$115/월** |

## 트러블슈팅

### ECS 태스크가 시작되지 않음

```bash
# 태스크 정의 확인
aws ecs describe-task-definition --task-definition alert-system-prod

# 서비스 이벤트 확인
aws ecs describe-services \
  --cluster alert-system-prod-cluster \
  --services alert-system-prod-service \
  --query 'services[0].events[:5]'
```

### 데이터베이스 연결 실패

1. 보안 그룹 확인 (ECS → RDS 인바운드)
2. 서브넷 라우팅 확인
3. RDS 엔드포인트 확인

### 스케줄러가 동작하지 않음

```bash
# 스케줄 목록 확인
aws scheduler list-schedules \
  --group-name alert-system-prod-alerts

# DLQ 메시지 확인
aws sqs receive-message \
  --queue-url https://sqs.ap-northeast-2.amazonaws.com/xxx/alert-system-prod-scheduler-dlq
```

## 롤백

### ECS 서비스 롤백

```bash
# 이전 태스크 정의로 롤백
aws ecs update-service \
  --cluster alert-system-prod-cluster \
  --service alert-system-prod-service \
  --task-definition alert-system-prod:PREVIOUS_REVISION
```

### Terraform 롤백

```bash
# 이전 상태로 복원
terraform plan -target=module.ecs
terraform apply -target=module.ecs
```

## 정리 (리소스 삭제)

⚠️ **주의: 프로덕션 데이터가 모두 삭제됩니다!**

```bash
# RDS 삭제 보호 해제
aws rds modify-db-instance \
  --db-instance-identifier alert-system-prod-db \
  --no-deletion-protection

# Terraform 리소스 삭제
terraform destroy
```
