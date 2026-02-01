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

## 🚨 코드 품질 체크리스트 (필수)

코드 작성/리뷰 시 아래 항목을 순서대로 검증합니다.

---

### 1. JSX 조건부 렌더링 검증

**발견된 버그 패턴**: 중첩된 모순 조건
```tsx
// ❌ 절대 참이 될 수 없는 중첩 조건 (버그)
{!showForm && (
  <section>
    {showForm && <Form />}  // 절대 렌더링 안됨!
  </section>
)}

// ✅ 올바른 분리
{!showForm && <TemplateSection />}
{showForm && <FormSection />}
```

**체크 항목**:
- [ ] 큰 `{condition && ...}` 블록 내에 반대 조건이 없는가?
- [ ] 삼항 연산자가 3단계 이상 중첩되지 않았는가?
- [ ] `&&` 연산자 좌측이 falsy일 때 `0`이나 `""`가 렌더링되지 않는가?
- [ ] 조건부 렌더링이 컴포넌트 최상위에서 명확하게 분리되어 있는가?

---

### 2. 상태 관리 검증

**체크 항목**:
- [ ] 관련 상태들이 함께 변경되는가? (예: `setShowForm(true)` 할 때 `setEditingItem(null)` 초기화)
- [ ] 상태 초기화가 필요한 곳에서 모두 이루어지는가?
- [ ] 파생 상태를 별도 `useState`로 관리하고 있지 않은가? (→ `useMemo` 사용)
- [ ] 비동기 작업 후 컴포넌트가 언마운트되었을 때 상태 업데이트 방지?
- [ ] `useEffect` 의존성 배열이 올바른가?

```tsx
// ❌ 파생 상태를 별도 state로 관리
const [items, setItems] = useState([]);
const [filteredItems, setFilteredItems] = useState([]);  // 파생 상태

// ✅ useMemo로 계산
const filteredItems = useMemo(() =>
  items.filter(item => item.active), [items]
);
```

---

### 3. 이벤트 핸들러 검증

**체크 항목**:
- [ ] 모든 클릭 가능한 요소가 실제로 동작하는가? (버튼, 링크, 아이콘)
- [ ] 이벤트 핸들러가 올바른 요소에 바인딩되어 있는가?
- [ ] 이벤트 버블링 문제가 없는가? (부모/자식 클릭 이벤트 충돌)
- [ ] 더블 클릭 방지가 필요한 곳에 적용되어 있는가?
- [ ] 키보드 접근성 (`onKeyDown`, `tabIndex`)이 필요한 곳에 있는가?

```tsx
// ❌ 부모-자식 클릭 이벤트 충돌
<div onClick={handleCardClick}>
  <button onClick={handleDelete}>삭제</button>  // 둘 다 실행됨!
</div>

// ✅ 이벤트 전파 중지
<button onClick={(e) => { e.stopPropagation(); handleDelete(); }}>삭제</button>
```

---

### 4. 폼 입력 검증

**체크 항목**:
- [ ] 모든 입력 필드에 `name` 또는 `id`가 있는가?
- [ ] 필수 입력 검증이 제출 전에 이루어지는가?
- [ ] 에러 메시지가 해당 필드 근처에 표시되는가?
- [ ] 입력 중 실시간 피드백이 필요한 곳에 있는가?
- [ ] `type="number"` 필드에서 음수/빈값 처리가 되어 있는가?
- [ ] 폼 제출 후 초기화가 필요한 곳에서 이루어지는가?

```tsx
// ❌ parseInt 결과가 NaN일 수 있음
onChange={(e) => setValue(parseInt(e.target.value))}

// ✅ 기본값 처리
onChange={(e) => setValue(parseInt(e.target.value) || 0)}
```

---

### 5. API 호출 검증

**체크 항목**:
- [ ] 로딩 상태(`isLoading`)가 표시되는가?
- [ ] 에러 발생 시 사용자에게 피드백이 있는가?
- [ ] 성공 시 다음 액션(리다이렉트, 목록 새로고침 등)이 이루어지는가?
- [ ] 네트워크 오류와 비즈니스 오류를 구분하여 처리하는가?
- [ ] 중복 요청 방지가 되어 있는가? (버튼 disabled 등)
- [ ] 낙관적 업데이트가 필요한 곳에 적용되어 있는가?

```tsx
// ✅ 완전한 API 호출 패턴
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async () => {
  if (isLoading) return;  // 중복 요청 방지
  setIsLoading(true);
  setError('');
  try {
    await api.create(data);
    onSuccess();  // 성공 처리
  } catch (err) {
    setError(err.message || '오류가 발생했습니다.');
  } finally {
    setIsLoading(false);
  }
};
```

---

### 6. 화면 전환/네비게이션 검증

**체크 항목**:
- [ ] 뒤로가기 버튼이 예상대로 동작하는가?
- [ ] 페이지 이동 후 스크롤 위치가 적절한가?
- [ ] 딥링크(직접 URL 접근)가 작동하는가?
- [ ] 로그인이 필요한 페이지에서 비로그인 시 리다이렉트되는가?
- [ ] 존재하지 않는 리소스 접근 시 404 처리가 되는가?
- [ ] 화면 전환 시 이전 화면의 상태가 올바르게 정리되는가?

---

### 7. UI 일관성 검증

**체크 항목**:
- [ ] 모달/폼 표시 시 불필요한 배경 요소가 숨겨지는가?
- [ ] 로딩 중 사용자가 다른 액션을 할 수 없도록 되어 있는가?
- [ ] 빈 상태(empty state) 처리가 되어 있는가?
- [ ] 에러/성공 메시지가 적절한 위치에 표시되는가?
- [ ] 메시지가 자동으로 사라지거나 닫을 수 있는가?
- [ ] 버튼 상태(enabled/disabled/loading)가 명확히 구분되는가?

---

### 8. 접근성(a11y) 검증

**체크 항목**:
- [ ] 모든 이미지에 `alt` 속성이 있는가?
- [ ] 아이콘 버튼에 `aria-label`이 있는가?
- [ ] 폼 필드에 연결된 `label`이 있는가?
- [ ] 키보드만으로 모든 기능을 사용할 수 있는가?
- [ ] 포커스 순서가 논리적인가?
- [ ] 색상만으로 정보를 전달하지 않는가?

---

### 9. 반응형/모바일 검증

**체크 항목**:
- [ ] 모바일 뷰포트에서 가로 스크롤이 없는가?
- [ ] 터치 타겟이 충분히 큰가? (최소 44x44px)
- [ ] 입력 시 가상 키보드로 인한 레이아웃 문제가 없는가?
- [ ] 긴 텍스트가 말줄임 또는 줄바꿈 처리되는가?

---

### 10. 핵심 사용자 플로우 검증

**경로 설정 페이지 (`/routes`)**:
- [ ] 비로그인 → 로그인 유도 메시지 표시
- [ ] 템플릿 선택 → 저장 → `/commute`로 리다이렉트
- [ ] "직접 만들기" 버튼 → 커스텀 폼 표시 (다른 UI 숨김)
- [ ] 체크포인트 추가 → 목록에 새 항목 표시
- [ ] 체크포인트 삭제 → 최소 2개 유지
- [ ] 경로 저장 → 저장된 경로 목록에 표시
- [ ] 저장된 경로 클릭 → `/commute?routeId=xxx`로 이동
- [ ] 수정 버튼 → 폼에 기존 데이터 로드
- [ ] 삭제 버튼 → 확인 후 목록에서 제거

**출퇴근 트래킹 페이지 (`/commute`)**:
- [ ] 경로 선택 → 세션 시작
- [ ] 스톱워치 모드 → 시간만 기록
- [ ] 체크포인트 도착 → 시간 기록 및 다음 단계로
- [ ] 세션 완료 → 대시보드로 이동
- [ ] 세션 취소 → 확인 후 데이터 삭제

**알림 설정 페이지 (`/alerts`)**:
- [ ] 새 알림 생성 → 폼 표시
- [ ] 알림 저장 → 목록에 표시
- [ ] 알림 활성화/비활성화 토글
- [ ] 알림 삭제 → 확인 후 제거

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
/alert-system/prod/scheduler-secret
/alert-system/prod/air-quality-api-key
/alert-system/prod/subway-api-key
/alert-system/prod/vapid-private-key
/alert-system/prod/solapi-api-key
/alert-system/prod/solapi-api-secret
/alert-system/prod/solapi-pf-id
/alert-system/prod/solapi-template-id
/alert-system/prod/scheduler-role-arn
/alert-system/prod/schedule-group-name
/alert-system/prod/scheduler-dlq-arn
```

### Solapi 설정 (알림톡)
| 항목 | 값 |
|------|-----|
| **API Key** | `NCSUDCVMRTFLTHIY` |
| **PF ID** | `KA01PF260118103514818QktedIWetBs` |
| **Template ID** | `KA01TP2601181035243285qjwlwSLm5X` |

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
2. ~~**Solapi 알림톡**: 템플릿 ID 설정~~ ✅ 완료
3. **ElastiCache Redis**: BullMQ 큐 (선택사항)
4. **커스텀 도메인**: Route 53 + ACM (선택사항)

---

## Render → AWS 마이그레이션 (완료)

> ⚠️ **Render는 더 이상 사용되지 않습니다.** 모든 백엔드는 AWS에서 실행됩니다.

### 마이그레이션 완료 항목
- [x] ECS Fargate로 NestJS 배포
- [x] CloudFront로 HTTPS 제공
- [x] SSM Parameter Store로 환경변수 관리
- [x] EventBridge Scheduler로 알림 스케줄링
- [x] Solapi 알림톡 설정

### Render 서비스 비활성화
```bash
# Render 서비스 일시정지 (필요시)
# Dashboard: https://dashboard.render.com → alert-system-backend → Suspend
```

---

*전역 설정 참조: `workspace/CLAUDE.md`, `SUPABASE_RULES.md`*
