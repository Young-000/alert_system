# Project: alert_system

## Overview
- **Name**: Alert System
- **Description**: 출근/퇴근 시 날씨, 미세먼지, 버스/지하철 도착시간을 통합 제공하는 알림 시스템
- **Tech Stack**: NestJS + React + TypeScript
- **Repository**: local

## Status
- **Current Status**: 🟢 Complete (AWS 전환 준비 완료)
- **Progress**: 100%
- **Priority**: High
- **Last Updated**: 2026-01-26 03:15:00

## Infrastructure

### Deployment
| Environment | Status | URL | Platform |
|-------------|--------|-----|----------|
| Production | 🟢 Deployed | https://alertsystem-phi.vercel.app | Vercel (Frontend) |
| Staging | ⚪ Not Deployed | - | - |
| Development | 🟢 Running | localhost:3001/5173 | Local |

### Database
| Type | Status | Provider | Notes |
|------|--------|----------|-------|
| Primary | 🟢 Connected (SQLite Dev) | Local SQLite | 개발 모드에서 SQLite 사용 |
| Supabase MCP | 🟢 Connected | Supabase | API Token 인증으로 정상 작동 |
| Cache | 🟡 Optional | Redis | BullMQ용 (선택적) |

> ✅ **개발 환경**: SQLite 모드로 로컬 개발 지원 (`USE_SQLITE=true`)

### External Services
| Service | Status | Purpose |
|---------|--------|---------|
| 미세먼지 API | 🟢 연동됨 | 대기질 정보 |
| 날씨 API | 🟢 연동됨 | 날씨 정보 |
| 버스 API | 🟢 연동됨 | 버스 도착 정보 |
| 지하철 API | 🟢 연동됨 | 지하철 도착 정보 |
| Web Push | 🟢 연동됨 | 푸시 알림 |
| 알림톡 (Solapi) | 🟢 연동됨 | 카카오 알림톡 |

### Completion
| Category | Progress | Notes |
|----------|----------|-------|
| Features | 100% | 모든 기능 구현 완료 |
| Tests | 100% | Backend 155 passed, E2E 14 passed |
| Docs | 100% | Swagger API 문서 포함 |
| CI/CD | 🟢 | Vercel 자동 배포 |

## Git Statistics
- **Total Commits**: 24
- **Last Commit**: 2026-01-26 01:34:51
- **Last Commit Message**: docs: simplify CLAUDE.md with global reference
- **Current Branch**: main
- **Uncommitted Changes**: 1 files

## Implementation Status

### Completed
- [x] User, Alert 엔티티 및 CRUD
- [x] 미세먼지 API 연동
- [x] Web Push 알림 서비스
- [x] BullMQ 작업 스케줄러
- [x] 프론트엔드 페이지 구현
- [x] PWA 설정
- [x] API 캐싱 레이어
- [x] Supabase 연동
- [x] 날씨/버스/지하철 API 연동
- [x] 알림 스케줄러 연동
- [x] JWT 인증 시스템
- [x] API 문서화 (Swagger)
- [x] 프론트엔드 UI 개선
- [x] Vercel 프로덕션 배포
- [x] Smart Notification (규칙 엔진)
- [x] Routine Automation (패턴 분석)
- [x] Privacy (데이터 보존)
- [x] 알림톡 (Solapi) 연동

### In Progress
- (없음)

### Pending
- (없음)

## Notes
- 개발 환경: `USE_SQLITE=true` 설정으로 SQLite 모드 사용 가능
- 프로덕션 환경: Supabase PostgreSQL 사용
- Redis는 선택적 (BullMQ 스케줄러용)

## AWS 전환 준비 상태

### 준비된 인프라
| 항목 | 상태 | 위치 |
|------|------|------|
| Terraform 모듈 | ✅ 준비 | `infra/terraform/` |
| VPC/네트워크 | ✅ 준비 | 7개 모듈 (vpc, alb, ecs, rds, elasticache, eventbridge, cloudwatch) |
| EventBridge Scheduler 서비스 | ✅ 준비 | `backend/src/infrastructure/scheduler/.aws-ready/` |
| Scheduler Trigger API | ✅ 준비 | `/scheduler/trigger` 엔드포인트 |
| CI/CD 파이프라인 | ✅ 준비 | `.github/workflows/deploy.yml` |
| 배포 가이드 | ✅ 준비 | `infra/DEPLOYMENT_GUIDE.md` |

### AWS 전환 단계
1. AWS SDK 설치: `npm install @aws-sdk/client-scheduler`
2. EventBridge 서비스 활성화 (`.aws-ready/` → `scheduler/`)
3. Terraform 인프라 배포
4. 환경변수 설정 (AWS_SCHEDULER_ENABLED=true)

### 예상 비용
| 서비스 | 월 비용 |
|--------|---------|
| ECS Fargate | ~$30 |
| ALB | ~$20 |
| RDS (db.t4g.micro) | ~$30 |
| ElastiCache | ~$25 |
| CloudWatch | ~$10 |
| **총합** | **~$115/월** |

## 🚀 배포 정보

### Frontend (Vercel)
- **URL**: https://frontend-xi-two-52.vercel.app
- **최신 배포**: https://frontend-iv289b99q-youngjaes-projects-fcb4b310.vercel.app
- **자동 배포**: GitHub push 시 자동 배포

### Backend (Render)
- **URL**: https://alert-system-kdg9.onrender.com
- **로컬 개발**: `npm run start:dev` (포트 3001)
- **프로덕션**: Render 무료 티어 (SQLite 모드)
- **주의**: Cold Start 시 ~30초 지연 가능

### 테스트 명령어
```bash
# Backend 테스트
cd backend && npm test

# Frontend E2E 테스트
cd frontend && E2E_BASE_URL=http://localhost:5173 E2E_API_URL=http://localhost:3001 npx playwright test
```

## 최근 E2E 검증 (2026-01-25 프로덕션)

### API 엔드포인트
| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /auth/register | ✅ | 회원가입 정상 (201) |
| POST /auth/login | ✅ | 로그인 정상 |
| POST /alerts | ✅ | 알림 생성 (JWT 인증 필요) |
| GET /alerts/user/:userId | ✅ | 알림 조회 정상 (200) |
| GET /air-quality/location | ✅ | 미세먼지 실시간 데이터 |
| GET /subway/stations | ✅ | 799개 역 검색 가능 |

### 프로덕션 E2E 테스트 결과
| 테스트 항목 | 상태 | 비고 |
|------------|------|------|
| Frontend 로드 | ✅ | Vercel 배포 정상 |
| Backend 연결 | ✅ | Render → Vercel 연결 |
| 회원가입 | ✅ | 201 Created |
| 로그인 유지 | ✅ | JWT 토큰 저장 |
| 마법사 UI | ✅ | Step 1-3 전환 정상 |

### UI/UX 반응형
| Viewport | Status |
|----------|--------|
| Mobile (375x667) | ✅ |
| Tablet (768x1024) | ✅ |
| Desktop (1920x1080) | ✅ |

## 최근 E2E 검증 (2026-01-26 AWS 전환 준비)

### 코드 품질
| 검사 | Backend | Frontend |
|------|---------|----------|
| TypeScript | ✅ 통과 | ✅ 통과 |
| ESLint | ✅ 통과 | ✅ 통과 |
| 빌드 | ✅ 성공 | ✅ 성공 |
| 테스트 | ✅ 155 passed | ✅ 15 passed |

### 변경사항
- EventBridge Scheduler 서비스 코드 준비 (AWS SDK 설치 전)
- Scheduler 컨트롤러 분리 (`scheduler-trigger.controller.ts`, `scheduler-legacy.controller.ts`)
- Terraform IaC 모듈 완성 (7개 모듈)
- GitHub Actions CI/CD 파이프라인 준비

---
*Last updated: 2026-01-26 03:15:00*
