# Alert System

출근/퇴근 시 날씨, 미세먼지, 버스/지하철 도착시간 통합 알림 시스템

---

## 🎯 의사결정 기준 (Architecture Decision Principles)

**이 프로젝트의 기술 선택 시 반드시 따를 원칙:**

### 1. 업계 표준 우선 (Industry Standard First)
```
❌ "기존 코드에 맞추면 빠르니까 X 쓰자"
✅ "업계에서 가장 많이 쓰는 게 뭐지? → 그걸 쓰자"
```
- AWS, GCP 같은 메이저 클라우드 우선
- 검색하면 답이 바로 나오는 기술 선택
- 이력서에 쓸 수 있는 기술 스택

### 2. 올바른 구조 > 쉬운 구조 (Correct > Easy)
```
❌ "환경변수만 바꾸면 되니까 이거 쓰자"
✅ "이 문제를 제대로 해결하는 방법이 뭐지?"
```
- 기존 코드 유지보다 **올바른 아키텍처** 우선
- 단기 편의보다 **장기 확장성** 고려
- "나중에 바꾸면 되지"는 금지

### 3. 핵심 기능에 최고 품질 (Best for Core Features)
```
이 프로젝트의 핵심: 개인별 스케줄링
→ 스케줄링에는 가장 좋은 솔루션 사용 (AWS EventBridge)
```
- 핵심 기능 식별 → 그 부분에 투자
- 부가 기능은 간단하게 해도 됨

### 4. 비용보다 가치 (Value > Cost)
```
❌ "무료니까 이거 쓰자"
✅ "월 $30 더 내면 제대로 된 서비스 쓸 수 있네"
```
- Free Tier에 맞추려고 구조를 망가뜨리지 않기
- 학습 가치, 이력서 가치도 비용에 포함

---

## Overview

| 항목 | 값 |
|------|-----|
| **Frontend URL** | https://frontend-xi-two-52.vercel.app |
| **Backend API (HTTPS)** | https://d1qgl3ij2xig8k.cloudfront.net |
| **Supabase** | Project 2 - `gtnqsbdlybrkbsgtecvy` |
| **Schema** | `alert_system` |

## 기술 스택

| 영역 | 상태 | 서비스 |
|------|:----:|--------|
| **Backend** | ✅ | AWS ECS Fargate (NestJS) |
| **Frontend** | ✅ | Vercel (React) |
| **Database** | ✅ | Supabase PostgreSQL |
| **CDN/HTTPS** | ✅ | AWS CloudFront |
| **Load Balancer** | ✅ | AWS ALB |
| **Container Registry** | ✅ | AWS ECR |
| **Secrets** | ✅ | AWS SSM Parameter Store |
| **Scheduling** | ✅ | EventBridge Scheduler (영구 스케줄) |

## 진행상황

| 영역 | 상태 | 비고 |
|------|:----:|------|
| Frontend | ✅ | Vercel 배포 |
| Backend (AWS) | ✅ | ECS Fargate + CloudFront |
| HTTPS | ✅ | CloudFront 배포 완료 |
| DB 연결 | ✅ | Supabase Pooler |
| ALB Health Check | ✅ | /health 엔드포인트 |
| **EventBridge** | ✅ | 영구 스케줄 완료 |

## DB 테이블

```sql
-- alert_system 스키마 사용
alert_system.users
alert_system.alerts
alert_system.subway_stations
alert_system.push_subscriptions
```

## AWS 리소스

| 리소스 | 이름/값 |
|--------|---------|
| **CloudFront** | `d1qgl3ij2xig8k.cloudfront.net` |
| **CloudFront ID** | `E1YZF6XW3X251G` |
| **ECS Cluster** | `alert-system-prod` |
| **ECS Service** | `alert-system-prod-service` |
| **ALB** | `alert-system-prod-alb` |
| **ALB DNS** | `alert-system-prod-alb-601836582.ap-northeast-2.elb.amazonaws.com` |
| **ECR Repository** | `alert-system` (378898678278.dkr.ecr.ap-northeast-2.amazonaws.com/alert-system) |
| **ECS Cluster** | `alert-system-prod-cluster` |
| **Schedule Group** | `alert-system-prod-alerts` |
| **API Destination** | `alert-system-prod-scheduler-api` |
| **SSM Prefix** | `/alert-system/prod/` |
| **Region** | `ap-northeast-2` (Seoul) |

## 환경 변수

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres.gtnqsbdlybrkbsgtecvy:...@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
NODE_ENV=development
PORT=3001
USE_SQLITE=true
JWT_SECRET=...
AIR_QUALITY_API_KEY=...
SOLAPI_API_KEY=...
```

### Frontend (.env.production)
```env
# AWS CloudFront (HTTPS)
VITE_API_BASE_URL=https://d1qgl3ij2xig8k.cloudfront.net
VITE_VAPID_PUBLIC_KEY=...
```

### AWS SSM Parameters
```
/alert-system/prod/database-url
/alert-system/prod/jwt-secret
/alert-system/prod/air-quality-api-key
/alert-system/prod/solapi-api-key
/alert-system/prod/solapi-api-secret
/alert-system/prod/solapi-pf-id
```

## 개발 명령어

```bash
# Backend (로컬)
cd backend && npm run start:dev

# Frontend (로컬)
cd frontend && npm run dev

# Docker (로컬 Redis)
docker-compose up -d redis
```

## AWS 배포 명령어

```bash
# 1. Docker 이미지 빌드 & 푸시
cd backend
docker build --platform linux/amd64 -t alert-system .
docker tag alert-system:latest 378898678278.dkr.ecr.ap-northeast-2.amazonaws.com/alert-system:latest
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 378898678278.dkr.ecr.ap-northeast-2.amazonaws.com
docker push 378898678278.dkr.ecr.ap-northeast-2.amazonaws.com/alert-system:latest

# 2. ECS 서비스 재배포
aws ecs update-service --cluster alert-system-prod-cluster --service alert-system-prod-service --force-new-deployment

# 3. 배포 상태 확인
aws ecs describe-services --cluster alert-system-prod-cluster --services alert-system-prod-service --query 'services[0].deployments'

# 4. 로그 확인
aws logs tail /ecs/alert-system-prod --follow

# 5. CloudFront 캐시 무효화 (필요시)
aws cloudfront create-invalidation --distribution-id E1YZF6XW3X251G --paths "/*"
```

## Known Issues (프로젝트 고유)

### ~~Render Cold Start~~ ✅ 해결됨
~~Backend (Render Free Tier) 첫 요청 시 ~30초 지연~~
→ AWS ECS Fargate + CloudFront로 전환 완료

### ~~HTTPS 설정~~ ✅ 해결됨
~~ALB는 HTTP만 지원~~
→ CloudFront 배포로 HTTPS 자동 제공

### ~~In-Memory Scheduler 손실~~ ✅ 해결됨
~~서버 재시작 시 모든 스케줄 손실~~
→ AWS EventBridge Scheduler로 영구 저장 완료

---

## AWS 아키텍처 (현재)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Vercel (Frontend)                          │
│                     React PWA ✅                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CloudFront (HTTPS) ✅                          │
│               d1qgl3ij2xig8k.cloudfront.net                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ALB (HTTP:80) ✅                             │
│           Internal Load Balancing                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ECS Fargate (NestJS) ✅                        │
│                Private Subnet + NAT Gateway                     │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────┐
│ Supabase  │  │ElastiCache│  │EventBridge│  │    CloudWatch     │
│PostgreSQL │  │  Redis    │  │ Scheduler │  │    Logs ✅        │
│    ✅     │  │   🔄      │  │    ✅     │  │                   │
└───────────┘  └───────────┘  └───────────┘  └───────────────────┘
```

### 다음 단계
1. ~~**EventBridge Scheduler**: 사용자별 알림 스케줄 영구 저장~~ ✅ 완료
2. **ElastiCache Redis**: BullMQ 큐 (선택사항)
3. **커스텀 도메인**: Route 53 + ACM (선택사항)

---

*전역 설정 참조: `workspace/CLAUDE.md`, `SUPABASE_RULES.md`*
