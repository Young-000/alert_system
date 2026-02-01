# Project: alert_system

## Overview
- **Name**: Alert System
- **Description**: 출근/퇴근 시 날씨, 미세먼지, 버스/지하철 도착시간을 통합 제공하는 알림 시스템
- **Tech Stack**: NestJS + React + TypeScript
- **Repository**: local

## Status
- **Current Status**: 🟢 Complete (AWS CloudFront + ECS Fargate 배포 완료)
- **Progress**: 100%
- **Priority**: High
- **Last Updated**: 2026-02-02 01:31:58

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
| Google OAuth | 🟡 코드 준비 | Google 로그인 (설정 필요) |

### Completion
| Category | Progress | Notes |
|----------|----------|-------|
| Features | 100% | 모든 기능 구현 완료 |
| Tests | 100% | Backend 155 passed, E2E 14 passed |
| Docs | 100% | Swagger API 문서 포함 |
| CI/CD | 🟢 | Vercel 자동 배포 |

## Git Statistics
- **Total Commits**: 66
- **Last Commit**: 2026-02-02 01:31:58
- **Last Commit Message**: feat: 경로 설정 UX 개선 - 미리보기 단계 추가
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

### Backend (AWS CloudFront + ECS Fargate)
- **URL**: https://d1qgl3ij2xig8k.cloudfront.net
- **인프라**: CloudFront → ALB → ECS Fargate
- **로컬 개발**: `npm run start:dev` (포트 3001)
- **프로덕션**: AWS ECS Fargate (arm64)
- **장점**: Render 대비 빠른 응답, 안정적인 스케일링

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

## Google OAuth 설정 가이드

### 1. Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** → **사용자 인증 정보** 이동

### 2. OAuth 2.0 클라이언트 ID 생성

1. **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID** 선택
2. 애플리케이션 유형: **웹 애플리케이션** 선택
3. 이름: `Alert System` (자유롭게 설정)
4. **승인된 자바스크립트 원본** 추가:
   - `http://localhost:5173` (개발용)
   - `https://frontend-xi-two-52.vercel.app` (프로덕션)
5. **승인된 리디렉션 URI** 추가:
   - `http://localhost:3001/auth/google/callback` (개발용)
   - `https://alert-system-kdg9.onrender.com/auth/google/callback` (프로덕션)
6. **만들기** 클릭 → Client ID, Client Secret 복사

### 3. 동의 화면 구성

1. **OAuth 동의 화면** → **외부** 선택
2. 앱 이름: `Alert System`
3. 사용자 지원 이메일: 본인 이메일
4. 개발자 연락처 정보: 본인 이메일
5. 범위 추가: `email`, `profile`, `openid`
6. 저장 후 **앱 게시** (테스트 모드에서 프로덕션으로 전환)

### 4. 환경변수 설정

#### Backend (Render)
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://alert-system-kdg9.onrender.com/auth/google/callback
FRONTEND_URL=https://frontend-xi-two-52.vercel.app
```

#### 로컬 개발 (.env)
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

### 5. 테스트

```bash
# Backend API로 Google OAuth 상태 확인
curl https://alert-system-kdg9.onrender.com/auth/google/status

# 응답 예시 (설정됨)
{"enabled":true,"message":"Google OAuth is configured"}

# 응답 예시 (미설정)
{"enabled":false,"message":"Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."}
```

### 6. 주의사항

- **테스트 모드**: 동의 화면이 테스트 모드일 경우, 테스트 사용자로 등록된 계정만 로그인 가능
- **프로덕션 전환**: 실제 서비스에서는 동의 화면을 프로덕션으로 게시해야 함
- **전화번호**: Google 로그인 시 전화번호는 비어있음 → 프로필 페이지에서 별도 입력 필요 (알림톡 발송용)

---

## 2026-01-27 업데이트

### 새로운 기능
- ✅ 알림 설정 무한 로딩 해결 (로딩 상태 UI 추가)
- ✅ 회원가입 시 전화번호 필수 입력 (알림톡 발송용)
- ✅ 알림톡 Solapi 연동 (날씨 알림 → 카카오 알림톡)
- ✅ 날씨/미세먼지 기반 팁 자동 생성
- ✅ 원클릭 날씨 알림 설정 UI
- ✅ Google OAuth 로그인 (코드 준비 완료, 설정 필요)

### 변경된 파일 (Backend)
- `src/domain/entities/user.entity.ts` - googleId 필드 추가
- `src/infrastructure/persistence/typeorm/user.entity.ts` - google_id 컬럼
- `src/infrastructure/auth/google.strategy.ts` - Google OAuth Strategy (신규)
- `src/application/use-cases/google-oauth.use-case.ts` - Google 로그인 Use Case (신규)
- `src/application/use-cases/send-notification.use-case.ts` - Solapi 알림톡 + tip 로직
- `src/presentation/controllers/auth.controller.ts` - Google OAuth 엔드포인트
- `src/presentation/modules/auth.module.ts` - GoogleStrategy 등록

### 변경된 파일 (Frontend)
- `src/presentation/pages/LoginPage.tsx` - Google 로그인 버튼 + 전화번호 입력
- `src/presentation/pages/AuthCallbackPage.tsx` - OAuth 콜백 처리 (신규)
- `src/presentation/pages/AlertSettingsPage.tsx` - 원클릭 날씨 알림 + 로딩 UI
- `src/presentation/index.css` - Google 버튼 스타일

---

## 2026-01-28 AWS 전환 완료 및 전체 검증

### AWS 인프라
| 서비스 | 상태 | 설명 |
|--------|------|------|
| CloudFront | ✅ | d1qgl3ij2xig8k.cloudfront.net |
| ALB | ✅ | 타겟 그룹 healthy |
| ECS Fargate | ✅ | arm64 컨테이너 |
| Supabase | ✅ | PostgreSQL 연결 |

### 브라우저 UI/UX 전체 검증 (Playwright MCP)
| 기능 | 상태 | 비고 |
|------|:----:|------|
| 홈페이지 | ✅ | 모든 요소 정상 |
| 로그인/로그아웃 | ✅ | JWT 토큰 관리 |
| 회원가입 | ✅ | 새 계정 생성, 자동 리다이렉트 |
| 알림 설정 위저드 | ✅ | 5단계 전체 정상 |
| 지하철 검색 | ✅ | "강남" 검색 → 결과 표시 |
| 알림 생성 | ✅ | POST /alerts → 201 |
| 알림 토글/삭제 | ✅ | 정상 작동 |
| 경로 설정 | ✅ | 체크포인트 설정 |
| 경로 저장 | ✅ | POST /routes → 201 |
| 통근 트래킹 | ✅ | 출발, 체크포인트 기록 |
| 통계 페이지 | ✅ | 데이터 없음 메시지 |

### API 응답 확인 (AWS CloudFront)
| 엔드포인트 | 상태 | 응답 |
|-----------|:----:|------|
| POST /auth/register | ✅ | 201 |
| POST /auth/login | ✅ | 200 |
| GET /alerts/user/:id | ✅ | 200 |
| GET /subway/stations | ✅ | 200 |
| POST /alerts | ✅ | 201 |
| POST /routes | ✅ | 201 |
| POST /commute/start | ✅ | 200 |

### 수정된 코드
1. **스케줄러 초기화 로직 추가** (`notification.module.ts`)
   - 서버 시작 시 DB에서 활성화된 알림 로드
   - 기존 알림 자동 스케줄링
   - 컨테이너 재시작 후에도 알림 유지

### 알려진 이슈
| 이슈 | 상태 | 설명 |
|------|:----:|------|
| "강남역" 검색 안됨 | ⚠️ | DB에 "강남"으로 저장 (개선 필요) |
| In-Memory 스케줄러 | ⚠️ | AWS EventBridge로 전환 권장 |

---
*Last updated: 2026-01-28 23:59:00*
