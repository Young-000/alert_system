# Cycle 1: 종합 프로젝트 감사 보고서

> 감사 일자: 2026-02-17
> 범위: 코드 품질 + UX/UI + 백로그 검증

---

## 1. 현황 요약

| 영역 | 파일 수 | 테스트 파일 | 테스트 통과 | 비고 |
|------|---------|------------|------------|------|
| Frontend (`src/`) | 107 | 10 | 45/45 | 커버리지 낮음 (페이지별 10~30%) |
| Backend (`src/`) | 202 | 33 | 220/230 (10 skip) | use-case 단위 테스트 양호 |
| CSS | 1파일 | - | - | 16,873줄 단일 파일 |
| 인프라 | Terraform | - | - | ECS+CloudFront+EventBridge 완료 |
| CI/CD | **없음** | - | - | GitHub Actions 미설정 |

**완성도 판정: 75% (PROGRESS.md의 85%에서 하향 조정)**
- 핵심 기능은 대부분 구현 완료 (경로, 알림, 트래킹, EventBridge)
- 하지만 CI/CD 부재, 테스트 커버리지 부족, Dead config 다수, CSS 관리 불가 상태

---

## 2. 코드 품질 감사

### 2.1 Frontend

#### 강점
- **Clean Architecture 경로 별칭**: `@domain`, `@infrastructure`, `@presentation` 잘 구성됨
- **Lazy Loading**: 모든 페이지가 `lazy()` + `Suspense`로 코드 스플리팅됨
- **Idle Preload**: 2초 후 주요 페이지 사전 로드하는 성능 최적화
- **useAuth 훅**: `useSyncExternalStore`로 반응형 인증 상태 관리 (잘 설계됨)
- **ApiClient**: Retry 로직, 타임아웃, 자동 401 처리 등 견고한 HTTP 클라이언트
- **접근성 기본**: skip-link, aria-label, role 속성 대부분 적용됨
- **ErrorBoundary + OfflineBanner**: 글로벌 에러/오프라인 처리 있음
- **alert-settings 위저드**: 잘 분리된 단계별 컴포넌트 (17개 파일, 총 2028줄)

#### 심각한 문제

**F-CRIT-1: HomePage.tsx 806줄 - God Component**
- 날씨 로직, 체크리스트 로직, 대중교통 API 호출, 경로 추천, 출발 예측 등 모든 것이 한 파일에 집중
- WeatherIcon SVG 컴포넌트가 페이지 파일 안에 인라인으로 정의됨 (110~165줄)
- 7개의 `useEffect`가 한 컴포넌트에 존재
- getWeatherChecklist, getAqiStatus 등 순수 유틸리티 함수가 컴포넌트 파일에 혼재
- **위험**: 유지보수 불가, 테스트 곤란, 변경 시 전체 리렌더링 위험

**F-CRIT-2: CSS 16,873줄 단일 파일 (index.css)**
- 프로젝트 전체 스타일이 하나의 CSS 파일에 집중
- 클래스 이름 충돌 위험, 미사용 CSS 누적, 변경 영향 범위 추적 불가
- Tailwind CSS로 마이그레이션이 글로벌 컨벤션이지만 전혀 적용되지 않음
- z-index 관리가 주석으로만 되어 있음 (강제 수단 없음)

**F-CRIT-3: `domain/` 및 `application/` 레이어 비어있음**
- Clean Architecture 별칭이 설정되어 있지만 `domain/`, `application/` 폴더에 파일 없음
- 비즈니스 로직이 모두 컴포넌트와 API 클라이언트에 분산됨
- 프론트엔드 도메인 레이어가 존재하지 않아 Architecture가 형식적

**F-CRIT-4: 프론트엔드 테스트 커버리지 극히 낮음**
- 10개 테스트 파일, 45개 테스트 - 대부분 '렌더링 되는지' 수준의 스모크 테스트
- route-setup 페이지 커버리지: 27.5% (Statements)
- commute-dashboard 컴포넌트 대부분: 10~20%
- 핵심 비즈니스 로직(날씨 체크리스트, 출발 예측, 경로 추천) 테스트 없음
- alert-settings 위저드 테스트 없음

#### 중요한 문제

**F-IMP-1: SettingsPage.tsx 652줄 - 과도한 크기**
- 4개 탭(프로필, 경로, 알림, 앱)의 모든 JSX가 한 파일에 존재
- alert-settings처럼 탭별 컴포넌트 분리 필요

**F-IMP-2: `eslint-disable` 주석 2곳**
- `AlertSettingsPage.tsx:136` - `react-hooks/exhaustive-deps` 무시
- `CommuteTrackingPage.tsx:108` - `react-hooks/exhaustive-deps` 무시
- 의존성 배열 문제는 숨기지 말고 근본적으로 해결해야 함

**F-IMP-3: 하드코딩된 좌표 (서울 위경도)**
- `HomePage.tsx:328-329`: `lat = 37.5665, lng = 126.978` 하드코딩
- 사용자 위치 기반이 아닌 고정 좌표로 날씨/미세먼지 조회
- 사용자가 서울 외 지역이면 잘못된 정보 제공

**F-IMP-4: LoginPage Cold Start 대응 코드 (Render 레거시)**
- `LoginPage.tsx:25-50`: 서버 예열(warm-up) 코드가 아직 있음
- AWS ECS는 Cold Start가 없으므로 불필요한 코드
- 45초 타임아웃, `serverStatus` 상태 등 전부 제거 가능

**F-IMP-5: `useAuth` 훅 존재하지만 대부분 페이지에서 미사용**
- 거의 모든 페이지가 `localStorage.getItem('userId')` 직접 호출
- `useAuth` 훅의 반응성 이점을 활용하지 못함

#### 개선 사항

**F-NICE-1: Vitest 전환 미완료**
- Jest 사용 중이나 글로벌 컨벤션은 Vitest 권장
- Vite 네이티브 통합으로 더 빠른 테스트 실행 가능

**F-NICE-2: Playwright E2E 테스트 2개 존재하지만 활용 미확인**
- `e2e/alert-system.spec.ts`, `e2e/auth.spec.ts` 존재
- CI에서 실행되지 않음 (CI 자체가 없음)

---

### 2.2 Backend

#### 강점
- **Clean Architecture 명확 분리**: domain/application/infrastructure/presentation 4레이어
- **Use-case 패턴**: 33개 테스트 파일, 220개 테스트 통과 (use-case 단위 커버리지 양호)
- **보안 기본**: Helmet, CORS 화이트리스트, Rate Limiting(ThrottlerGuard), JWT 전역 가드
- **ValidationPipe**: whitelist + forbidNonWhitelisted로 DTO 검증 엄격
- **EventBridge Scheduler**: 영구 스케줄 구현 완료 (핵심 기능)
- **DevController 프로덕션 보호**: 이중 안전장치 (모듈 제외 + NODE_ENV 체크)
- **Cached API Clients**: 날씨/대기질/교통 API에 캐시 래퍼 적용
- **데이터 프라이버시**: GDPR 스타일 데이터 내보내기/삭제 기능

#### 심각한 문제

**B-CRIT-1: Render 잔여 참조 다수**
- `.env.test`: `VITE_API_BASE_URL=https://alert-system-commute-test.onrender.com`
- `.env.production`: Render URL이 주석으로 남아있음
- `.claude/STATUS.md`: Render 프로덕션 URL 다수 참조
- `.claude/commands/validate-supabase.md`: Render URL로 테스트 명령어
- `COMMUTE_TRACKING_PROGRESS.md`: Render 배포 URL 기록
- **위험**: 잘못된 환경 설정으로 테스트 시 Render로 요청 가능

**B-CRIT-2: `.aws-ready/` 폴더 - 미사용 Dead Code**
- `backend/src/infrastructure/scheduler/.aws-ready/eventbridge-scheduler.service.ts` (265줄)
- 실제 사용되는 `eventbridge-scheduler.service.ts`와 별도로 동일 폴더에 백업 존재
- 혼란 유발, 제거 필요

**B-CRIT-3: Controller 테스트 커버리지 0%**
- 16개 컨트롤러 중 `alert.controller`만 98% 커버리지
- 나머지 15개 컨트롤러: 전부 0% 커버리지
- commute, auth, behavior, privacy 등 핵심 컨트롤러 테스트 부재

**B-CRIT-4: InMemoryNotificationScheduler - 레거시 코드**
- EventBridge로 전환 완료했지만 In-Memory 스케줄러 코드(139줄)가 남아있음
- `queue.module.ts`에서 `QUEUE_ENABLED` 환경변수로 분기
- 실제 프로덕션에서 사용되지 않는 코드 경로

#### 중요한 문제

**B-IMP-1: CI/CD 파이프라인 없음**
- `.github/workflows/` 디렉토리 자체가 없음
- 글로벌 컨벤션에서 필수로 정의한 `ci.yml`, `deploy.yml` 모두 부재
- 코드가 main에 직접 머지될 때 lint/typecheck/test/build 검증 없음

**B-IMP-2: 프로젝트 루트에 레거시 MD 파일 20개 산재**
- `CHECKLIST.md`, `COMMUTE_TRACKING_PROGRESS.md`, `CURSOR_MOBILE_WORKFLOW.md`, `E2E_CHECKLIST.md`, `GIT_SETUP.md`, `IMPLEMENTATION_STATUS.md`, `MOBILE_SETUP.md`, `MOBILE_WORK_SIMPLE.md`, `PROJECT_OVERVIEW.md`, `PROJECT_REVIEW.md`, `PUSH_INSTRUCTIONS.md`, `PUSH_TO_GIT.md`, `QUALITY_CHECKLIST.md`, `QUICK_START.md`, `SETUP_SUPABASE.md`, `SIMPLE_SETUP.md`, `SUPABASE_SETUP.md`, `WARP.md`
- 대부분 이전 단계의 일회성 작업 기록
- `docs/` 디렉토리에 `PRD.md`, `PROGRESS.md`가 있으므로 루트 파일 정리 필요

**B-IMP-3: Swagger 프로덕션 노출 방지 확인 필요**
- `main.ts`에서 `NODE_ENV !== 'production'`일 때만 Swagger 활성화
- 하지만 프로덕션 환경에서 `NODE_ENV` 설정 확인 필요 (SSM에 있는지)

**B-IMP-4: `better-sqlite3` 프로덕션 의존성**
- `backend/package.json`에 `better-sqlite3`가 dependencies에 포함됨
- E2E 테스트용이면 devDependencies로 이동해야 함
- 불필요한 프로덕션 빌드 크기 증가

#### 개선 사항

**B-NICE-1: Solapi 주간 리포트 TODO**
- `solapi.service.ts:210`: 주간 리포트 템플릿 승인 대기 중
- 당장 급하지 않지만 추적 필요

---

## 3. UX/UI 감사

### 3.1 정보 구조 (IA)

**현재 네비게이션 구조:**
```
홈(/) ─ 경로(/routes) ─ 알림(/alerts) ─ 설정(/settings)
                │              │              │
                ├─ 트래킹      ├─ 위저드       ├─ 프로필
                │  (/commute)  │  (인라인)     ├─ 경로 관리
                │              │              ├─ 알림 관리
                └─ 대시보드     │              └─ 앱 설정
                   (/commute/  │                  ├─ 푸시 알림
                    dashboard) │                  ├─ 알림 기록
                               │                  └─ 개인정보
                               │
                               └─ 온보딩(/onboarding)
```

**IA 문제점:**

**UX-CRIT-1: 설정 페이지의 역할 모호**
- 설정 페이지에서 경로 삭제, 알림 토글, 푸시 설정, 데이터 내보내기 등 모든 관리 기능 수행
- `/routes`에서도 경로 관리, `/alerts`에서도 알림 관리 가능
- 동일 기능이 2곳에서 제공되어 사용자 혼란 발생

**UX-CRIT-2: 알림 기록 페이지의 접근성 문제**
- `/notifications`은 설정 > 앱 탭 내부의 링크로만 접근 가능
- 하단 네비게이션에 없으며, 홈 페이지에서도 직접 접근 불가
- 알림 발송 결과 확인은 자주 필요한 기능인데 접근 경로가 깊음

### 3.2 사용자 플로우

**양호한 플로우:**
- 비로그인 시 Guest Landing 페이지 표시 (깔끔한 CTA)
- 경로 등록 위저드 (단계별 진행, 드래그앤드롭)
- 알림 설정 위저드 (5단계 진행, 빠른 프리셋)
- 출퇴근 시작 -> 트래킹 -> 대시보드 흐름

**문제 플로우:**

**UX-IMP-1: 첫 사용자 온보딩 후 방치**
- 온보딩 페이지에서 기본 경로 생성 가능하지만, 이후 알림 설정으로의 연결 없음
- 사용자가 경로 만들고 알림을 설정해야 하는데, 이 연결이 자연스럽지 않음
- 홈 페이지의 "알림 설정" CTA가 있지만 시각적으로 약함

**UX-IMP-2: 출퇴근 트래킹 시작의 이중 경로**
- 홈 페이지 "출발하기" 버튼 -> 세션 시작 -> `/commute`
- `/commute` 직접 접근 시 경로 선택부터 시작
- 세션 시작 실패 시 fallback으로 `/commute`로 이동하지만 세션 없이 이동

**UX-IMP-3: 에러 피드백 사일런트 처리 다수**
- `SettingsPage.tsx:87-89`: 알림 토글 실패 시 무시 (catch에 빈 블록)
- `SettingsPage.tsx:105-106`: 삭제 실패 시 무시
- `HomePage.tsx:311`: 데이터 로드 실패 시 catch에 빈 블록
- 사용자에게 실패를 알리지 않아 작업이 성공한 것으로 오해할 수 있음

### 3.3 모바일/반응형

**양호:**
- 41개 미디어 쿼리로 반응형 대응
- `overscroll-behavior: none` 적용
- PWA 매니페스트 설정 완료 (standalone, shortcuts)
- 하단 네비게이션 모바일 패턴

**문제:**
- **UX-IMP-4**: CSS 16,873줄에서 반응형 규칙 추적이 불가능
- 터치 타겟 크기(44x44px) 준수 여부 검증 어려움

### 3.4 접근성

**양호:**
- skip-link 적용 (`본문으로 건너뛰기`)
- `aria-label`, `aria-pressed`, `aria-current` 다수 사용
- `role="status"`, `aria-live="polite"` 로딩 상태에 적용
- `aria-hidden="true"` 장식 아이콘에 적용
- `<main>`, `<header>`, `<section>`, `<nav>` 시맨틱 태그 사용
- `<button type="button">` 적절히 사용

**문제:**
- **UX-NICE-1**: 포커스 관리 - 모달 열 때 focus trap은 ConfirmModal에만 있고 다른 모달에는 없음
- **UX-NICE-2**: 탭 패널에 `role="tabpanel"`, `aria-labelledby` 속성 누락 (SettingsPage 탭)

### 3.5 디자인 일관성

**양호:**
- CSS Custom Properties로 디자인 토큰 관리 (색상, 간격, 그림자)
- Pretendard 폰트 통일
- 상태 색상 체계 (success, warning, error) 일관됨

**문제:**
- **UX-IMP-5**: 인라인 SVG 아이콘이 모든 컴포넌트에 직접 작성됨
  - BottomNavigation, SettingsPage, HomePage 등 각각 SVG 하드코딩
  - 아이콘 라이브러리나 공유 컴포넌트 없음
  - 같은 아이콘이 여러 파일에 중복 정의됨

---

## 4. 백로그 검증

### 기존 백로그 항목 평가

| 기존 항목 | 여전히 필요? | RICE 점수 | 비고 |
|----------|:----------:|----------:|------|
| Dead config 정리 | **예** | 높음 | Render 참조가 여전히 코드에 존재 |
| 프론트엔드 품질 개선 | **예** | 높음 | HomePage 분리, 테스트 추가 필수 |
| UX/UI 개선 | **예** | 중간 | 에러 피드백, IA 정리 필요 |
| 알림 발송 모니터링 대시보드 | **나중** | 낮음 | 사용자 기반 확보 후 의미 있음 |
| ElastiCache Redis | **나중** | 낮음 | EventBridge로 충분, Redis 당장 불필요 |
| 커스텀 도메인 | **나중** | 낮음 | 기능 안정화 우선 |
| 사용자 통계/분석 | **나중** | 낮음 | 사용자 기반 확보 후 |
| 다국어 지원 | **불필요** | - | 타겟이 한국 직장인, 우선순위 낮음 |
| 알림 유형 확장 | **나중** | 낮음 | 핵심 품질 우선 |

### 새로 발견된 항목

| 항목 | 우선순위 | RICE |
|------|---------|------|
| CI/CD 파이프라인 구축 | **Critical** | 최고 |
| HomePage God Component 분리 | **Critical** | 높음 |
| CSS 모듈화/Tailwind 마이그레이션 시작 | **Important** | 높음 |
| 프론트엔드 `useAuth` 통합 | **Important** | 중간 |
| 루트 레거시 MD 파일 정리 | **Important** | 중간 |
| SVG 아이콘 시스템 구축 | **Nice-to-have** | 낮음 |

---

## 5. 우선순위화된 작업 목록

### Critical (즉시 수정) - 시스템 안정성/품질 기반

| # | 항목 | 노력 | RICE | 근거 |
|---|------|------|------|------|
| C-1 | **CI/CD 파이프라인 구축** (GitHub Actions: lint + typecheck + test + build) | M | R:100 I:3 C:100% E:1 = **300** | 모든 변경의 품질 게이트 부재. 컨벤션 필수 항목. |
| C-2 | **Dead Config 정리** (Render URL, .aws-ready, InMemory Scheduler, Cold Start 코드) | S | R:100 I:2 C:100% E:0.5 = **400** | 잘못된 환경 설정 위험 + 코드 혼란 제거 |
| C-3 | **프로젝트 루트 레거시 문서 정리** (20개 MD 파일 아카이브/삭제) | S | R:100 I:1 C:100% E:0.5 = **200** | 프로젝트 탐색 혼란 제거 |

### Important (빠른 시일 내 수정) - 유지보수성/사용자 경험

| # | 항목 | 노력 | RICE | 근거 |
|---|------|------|------|------|
| I-1 | **HomePage.tsx 분리** (날씨 섹션, 교통 섹션, 유틸 함수 추출) | L | R:100 I:2 C:80% E:2 = **80** | 806줄 God Component, 유지보수 불가 |
| I-2 | **CSS 모듈화 1단계** (CSS Custom Properties 표준화 + 페이지별 파일 분리) | L | R:100 I:2 C:80% E:3 = **53** | 16,873줄 단일 파일 관리 불가 |
| I-3 | **에러 피드백 사일런트 처리 수정** (catch 블록에 사용자 알림 추가) | S | R:100 I:2 C:100% E:0.5 = **400** | 사용자가 오류를 인지하지 못함 |
| I-4 | **프론트엔드 `useAuth` 훅 전면 적용** (localStorage 직접 호출 제거) | M | R:100 I:1 C:100% E:1 = **100** | 일관성 부족, 반응성 미활용 |
| I-5 | **핵심 비즈니스 로직 테스트 추가** (날씨 체크리스트, AQI 판정, 경로 추천) | M | R:100 I:2 C:80% E:1.5 = **107** | 비즈니스 로직 무방비 |
| I-6 | **하드코딩 좌표 제거** (사용자 위치 또는 설정에서 좌표 가져오기) | M | R:80 I:2 C:80% E:1 = **128** | 서울 외 사용자에게 잘못된 정보 |
| I-7 | **SettingsPage.tsx 탭별 컴포넌트 분리** | M | R:100 I:1 C:100% E:1 = **100** | 652줄, 유지보수성 |
| I-8 | **better-sqlite3를 devDependencies로 이동** | S | R:100 I:0.5 C:100% E:0.25 = **200** | 프로덕션 빌드 최적화 |

### Nice-to-have (시간 여유 시)

| # | 항목 | 노력 | RICE | 근거 |
|---|------|------|------|------|
| N-1 | **Jest -> Vitest 마이그레이션** | M | R:100 I:0.5 C:80% E:1 = **40** | 글로벌 컨벤션 준수 |
| N-2 | **SVG 아이콘 시스템 구축** (공유 Icon 컴포넌트) | M | R:100 I:0.5 C:80% E:1 = **40** | 중복 코드 제거, 일관성 |
| N-3 | **알림 기록 페이지 접근성 개선** (네비게이션에서 직접 접근) | S | R:50 I:1 C:80% E:0.5 = **80** | 사용 빈도 대비 접근 경로 깊음 |
| N-4 | **접근성: 탭 패널 ARIA 속성 추가** | S | R:100 I:0.5 C:100% E:0.5 = **100** | WCAG 준수 |
| N-5 | **Backend Controller 테스트 추가** | XL | R:100 I:1 C:50% E:4 = **12.5** | 0% 커버리지이나 use-case 테스트 있음 |
| N-6 | **eslint-disable 2곳 해결** (의존성 배열 수정) | S | R:100 I:0.5 C:80% E:0.5 = **80** | 잠재적 버그 원인 |
| N-7 | **Tailwind CSS 점진적 도입** (새 컴포넌트부터) | L | R:100 I:1 C:50% E:3 = **17** | 글로벌 컨벤션, 장기 전략 |
| N-8 | **ElastiCache Redis 활성화** | L | R:50 I:1 C:50% E:2 = **12.5** | EventBridge로 당장 불필요 |
| N-9 | **Solapi 주간 리포트 템플릿** | M | R:50 I:1 C:50% E:1 = **25** | 템플릿 승인 대기 |
| N-10 | **커스텀 도메인** (Route 53 + ACM) | M | R:100 I:0.5 C:80% E:1 = **40** | 브랜딩, 당장 급하지 않음 |

---

## 6. 추천 실행 순서 (사이클별)

### Cycle 2: 품질 기반 구축 (C-1, C-2, C-3, I-3, I-8)
- CI/CD 파이프라인 + Dead config 정리 + 레거시 문서 정리 + 에러 피드백 + deps 정리
- 예상 노력: M (2~3 세션)

### Cycle 3: 코드 구조 개선 (I-1, I-7, I-4)
- HomePage 분리 + SettingsPage 분리 + useAuth 통합
- 예상 노력: L (3~4 세션)

### Cycle 4: 테스트 & CSS (I-5, I-2, I-6)
- 핵심 로직 테스트 + CSS 파일 분리 + 좌표 하드코딩 제거
- 예상 노력: L (3~4 세션)

### Cycle 5+: 개선 (N-1~N-10)
- 우선순위 순서대로 진행

---

## 7. 결론

Alert System은 핵심 기능(경로, 알림, EventBridge 스케줄링, 트래킹)이 잘 구현된 프로젝트다. Backend의 Clean Architecture와 Use-case 패턴은 양호하며, 보안 설정(Helmet, Rate Limiting, JWT Guard)도 적절하다.

그러나 **품질 기반 인프라가 부족**하다. CI/CD 파이프라인이 없어 모든 변경이 검증 없이 배포되고, 프론트엔드의 God Component와 16K줄 CSS 파일은 유지보수를 어렵게 만든다. Render에서 AWS로 마이그레이션은 완료했지만, 잔여 참조와 레거시 코드 정리가 남아있다.

**가장 시급한 3가지:**
1. CI/CD 파이프라인 구축 (없으면 다른 모든 개선의 효과가 반감)
2. Dead config 정리 (잘못된 환경 설정 위험 제거)
3. 사일런트 에러 처리 수정 (사용자 경험 직접 영향)

이후 HomePage 분리, CSS 모듈화, 테스트 강화 순서로 진행하면 프로젝트 품질을 체계적으로 향상시킬 수 있다.

---

*감사: PM Agent (Cycle 1)*
*다음 작업: Cycle 2 스펙 작성 -> CI/CD + Dead Config 정리*
