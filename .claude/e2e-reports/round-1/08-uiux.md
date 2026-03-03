# 08. UI/UX - 배포 URL 접속 검증

**Date**: 2026-02-28
**Branch**: `main`
**Deploy URL**: https://frontend-xi-two-52.vercel.app
**Test Method**: Playwright MCP (a11y snapshot) + Chrome DevTools MCP + Source Code Analysis
**Viewports Tested**: 375px (mobile), 768px (tablet), 1920px (desktop)

---

## Overall Status: PASS (경미한 이슈 5건)

---

## 1. 반응형 확인 (375px / 768px / 1920px)

| # | Check | Result | Notes |
|---|-------|:------:|-------|
| 1-1 | 모바일(375px) 레이아웃 | **PASS** | 모든 섹션 수직 스택, 가로 스크롤 없음. `overflow-x: hidden` on html/body |
| 1-2 | 태블릿(768px) 레이아웃 | **PASS** | 동일한 단일 컬럼 레이아웃. `max-width: 768px` bottom-nav 제한 |
| 1-3 | 데스크톱(1920px) 레이아웃 | **PASS** | `.page { max-width: 1000px; margin: 0 auto }` 센터 정렬. home-page는 `max-width: 640px` |
| 1-4 | 하단 네비게이션 5개 탭 | **PASS** | 홈/경로/리포트/알림/설정 — 모든 뷰포트에서 정상 표시 |
| 1-5 | Safe area insets | **PASS** | `env(safe-area-inset-*)` 적용 (padding, bottom-nav) |
| 1-6 | 모바일 가로 스크롤 방지 | **PASS** | html/body `overflow-x: hidden` + `.page { overflow-x: hidden; width: 100% }` |
| 1-7 | 설정 탭 가로 스크롤 | **PASS** | `.settings-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch }` |
| 1-8 | Font sizing responsive | **PASS** | h1 `clamp(2rem, 4vw, 2.75rem)`, 반응형 미디어 쿼리 다수 (480px, 600px, 768px, 900px, 1200px) |

### 미디어 쿼리 브레이크포인트 분석

| Breakpoint | 사용 위치 | 목적 |
|-----------|----------|------|
| 360px | home.css | 극소형 디바이스 레이아웃 |
| 374px | home.css, commute.css | iPhone SE 대응 |
| 390px | routes.css, commute.css | iPhone 14 대응 |
| 480px | 다수 (home, routes, commute, auth, missions, mission-settings) | 소형 모바일 |
| 600px | 다수 (components, home, alerts, missions) | 모바일/태블릿 경계 |
| 768px | home.css, routes.css, commute.css, alerts.css | 태블릿 |
| 900px | home.css, components.css | 태블릿/데스크톱 경계 |
| 1200px | home.css | 대형 데스크톱 |

---

## 2. 빈 상태(Empty State) 처리

| # | Page | Result | Empty State Content |
|---|------|:------:|---------------------|
| 2-1 | 홈 (비로그인) | **PASS** | `GuestLanding` 컴포넌트: hero + 3 feature cards + CTA "무료로 시작하기" |
| 2-2 | 경로 (로그인, 경로 없음) | **PASS** | 아이콘 + "경로가 없어요" + "출퇴근 경로를 추가해보세요" + "경로 추가" 버튼 |
| 2-3 | 알림 (비로그인) | **PASS** | `AuthRequired` 컴포넌트: 아이콘 + "로그인이 필요해요" + 설명 + 로그인 버튼 |
| 2-4 | 설정 (비로그인) | **PASS** | `AuthRequired` 동일 패턴 |
| 2-5 | 미션 (미션 없음) | **PASS** | `.mission-empty`: 아이콘 + "미션을 설정해보세요!" + 설정 버튼 |
| 2-6 | 리포트 (비로그인) | **PASS** | "로그인이 필요합니다" + 로그인하기 버튼 |
| 2-7 | 대시보드 (기록 없음) | **PASS** | 아이콘 + "아직 기록이 없어요" + 설명 + "트래킹 시작하기" 링크 |
| 2-8 | 홈 - 출퇴근 섹션 (경로 없음) | **PASS** | "출근 경로를 등록해보세요" + 설명 + "경로 등록하기" 링크 |
| 2-9 | 홈 - 알림 섹션 (알림 없음) | **PASS** | "알림을 설정하면 출발 전 날씨와 교통 정보를 알려드려요" + /alerts 링크 |
| 2-10 | 홈 - 통계 섹션 (기록 없음) | **PASS** | "이번 주 출퇴근 기록 없음" + "출퇴근 기록을 시작하면 통계를 볼 수 있어요" + 대시보드 링크 |
| 2-11 | 404 페이지 | **PASS** | "404" + "페이지를 찾을 수 없습니다" + 설명 + 홈으로/알림 설정 버튼 |
| 2-12 | 미션 퀵카드 (미설정) | **PASS** | "미션을 설정해보세요!" + /missions/settings 링크 |

---

## 3. 로딩 상태 표시

| # | Page/Component | Result | Loading Pattern |
|---|---------------|:------:|-----------------|
| 3-1 | 홈 페이지 | **PASS** | Skeleton: `.home-greeting-skeleton` + `.skeleton-card` (lg/sm) |
| 3-2 | 경로 목록 | **PASS** | "불러오는 중..." 텍스트 (`role="status"`, `aria-live="polite"`) |
| 3-3 | 알림 목록 | **PASS** | Spinner + "서버에 연결 중입니다..." + "최대 30초가 소요될 수 있습니다" |
| 3-4 | 설정 탭 | **PASS** | "불러오는 중..." (`role="status"`, `aria-live="polite"`) |
| 3-5 | 대시보드 | **PASS** | "통계를 불러오는 중..." (`role="status"`) |
| 3-6 | 주간 리포트 카드 | **PASS** | Skeleton 바 (width, height 지정) |
| 3-7 | 미션 페이지 | **PASS** | `.missions-skeleton` 스켈레톤 시스템 |
| 3-8 | Page-level lazy loading | **PASS** | `.page-skeleton` (title + hero + card skeleton) |
| 3-9 | 로그인 버튼 | **PASS** | Spinner + "처리 중..." 텍스트, `disabled` 상태 |
| 3-10 | 버튼 로딩 방지 | **PASS** | `if (isLoading) return;` / `disabled={isSubmitting}` 패턴 |

### Skeleton CSS 시스템

존재하는 skeleton 클래스: `.skeleton`, `.skeleton-text`, `.skeleton-title`, `.skeleton-button`, `.skeleton-card`, `.skeleton-avatar`, `.page-skeleton`, `.page-skeleton-title`, `.page-skeleton-hero`, `.page-skeleton-card`
애니메이션: `skeleton-shimmer` (1.5s infinite), staggered delays (nth-child)

---

## 4. 에러 상태 처리

| # | Error Type | Result | Handling |
|---|-----------|:------:|----------|
| 4-1 | 홈 - 데이터 로드 실패 | **PASS** | `.home-error-notice` + "다시 시도" 버튼 (`retryLoad`) |
| 4-2 | 날씨 API 실패 | **PASS** | `weatherError` 표시 (`role="alert"`) |
| 4-3 | 주간 리포트 실패 | **PASS** | "주간 리포트를 불러올 수 없습니다" (`role="alert"`) - 라이브에서 확인됨 |
| 4-4 | 경로 저장 실패 | **PASS** | 네트워크 오류/401/일반 오류 분류 처리 |
| 4-5 | 알림 생성 실패 | **PASS** | 401/403/일반 에러 분류 + 중복 알림 감지 |
| 4-6 | 로그인 실패 | **PASS** | 409 (중복) / 일반 에러 분류 + `role="alert"` 표시 |
| 4-7 | 오프라인 상태 | **PASS** | `OfflineBanner` 컴포넌트: `role="alert"`, `aria-live="assertive"`, z-index 1002 |
| 4-8 | 미션 에러 | **PASS** | `.mission-error` + `.btn-retry` 재시도 버튼 |
| 4-9 | 콘솔 에러 (라이브) | **WARN** | 2개 API 에러 발견: streak API 404, weeklyReport API 404 (서버 측 이슈) |

---

## 5. 디자인 일관성

| # | Aspect | Result | Notes |
|---|--------|:------:|-------|
| 5-1 | 색상 체계 | **PASS** | CSS 변수 기반 일관된 팔레트: `--primary` (#6366f1), `--success` (#10b981), `--warning` (#f59e0b), `--error` (#ef4444) |
| 5-2 | 폰트 | **PASS** | Pretendard Variable (CDN, font-display: swap) + fallback 메트릭 오버라이드 (CLS 최소화) |
| 5-3 | 간격 체계 | **PASS** | CSS 변수 기반 radius (`--radius-xl/lg/md/sm`), shadow (`--shadow-sm/md/lg/primary`) |
| 5-4 | 카드 스타일 | **PASS** | 일관된 `--bg-card` + `--border` + `--radius-lg` 패턴 |
| 5-5 | 버튼 스타일 | **PASS** | `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-link`, `.btn-danger` 체계 |
| 5-6 | 그래디언트 | **PASS** | 3종 일관된 사용: `--gradient-primary`, `--gradient-warm`, `--gradient-cool` |
| 5-7 | z-index 계층 | **PASS** | 문서화된 hierarchy: 100(headers) -> 1000(bottom-nav) -> 1001(wizard) -> 1002(offline) -> 1003(toast) -> 1100(modal) |
| 5-8 | 다크 모드 | **N/A** | 라이트 모드만 지원 (앱인토스 가이드라인 준수) |
| 5-9 | High contrast mode | **PASS** | `@media (forced-colors: active)` 지원 |
| 5-10 | Reduced motion | **PASS** | `@media (prefers-reduced-motion: reduce)` 지원: 애니메이션 제거, 필수 피드백만 유지 |

---

## 6. 터치 타겟 크기 (최소 44x44px)

| # | Element | Size | Result | Notes |
|---|---------|------|:------:|-------|
| 6-1 | 하단 네비게이션 아이템 | `min-height: 44px; min-width: 52px` | **PASS** | 모바일에서 `padding: 8px 12px; min-width: 56px` |
| 6-2 | 뒤로가기 버튼 (apple-back, nav-back) | `min-width: 44px; min-height: 44px` | **PASS** | UX 개선으로 44px 적용됨 |
| 6-3 | 미션 뒤로가기 (missions-back) | `width: 32px; height: 32px` | **WARN** | 44px 미달 (32px) |
| 6-4 | 미션 설정 뒤로가기 (msettings-back) | `width: 32px; height: 32px` | **WARN** | 44px 미달 (32px) |
| 6-5 | 토스트 닫기 버튼 | `w-6 h-6` (24px) | **WARN** | 44px 미달 (24px) |
| 6-6 | 체크포인트 삭제 (.btn-icon) | `width: 44px; height: 44px` | **PASS** | |
| 6-7 | 스킵 링크 | `min-height: 44px` | **PASS** | |
| 6-8 | 설정 nav-back | `min-width: 44px; min-height: 44px` | **PASS** | |
| 6-9 | 알림 위저드 버튼 | `min-height: 48px` (wizard-btn) | **PASS** | |
| 6-10 | 미션 체크 카드 | `padding: 14px 16px` (전체 카드가 클릭 영역) | **PASS** | 충분한 터치 영역 |

---

## 7. 주요 페이지별 Playwright 스냅샷 검증

| # | Page | URL | Viewport | Result | Notes |
|---|------|-----|----------|:------:|-------|
| 7-1 | 홈 | `/` | 375px | **PASS** | 인사 헤더 + 모드 배지 + 미션 카드 + 주간 리포트 + 날씨 + 브리핑 + 출퇴근 + 알림 + 통계 |
| 7-2 | 홈 | `/` | 768px | **PASS** | 동일 컴포넌트, 넓어진 레이아웃 |
| 7-3 | 홈 | `/` | 1920px | **PASS** | 640px max-width 센터 정렬 |
| 7-4 | 경로 | `/routes` | 375px | **PASS** | 헤더 + empty state ("경로가 없어요") |
| 7-5 | 리포트 | `/reports` | 375px | **PASS** | 탭바 (이번 주/월간/요약) + 데이터 영역 |
| 7-6 | 알림 | `/alerts` | 375px | **PASS** | 헤더 + 로딩 스피너 + footer |
| 7-7 | 설정 | `/settings` | 375px | **PASS** | 6개 탭 (프로필/경로/알림/장소/출발/앱) + 로딩 표시 |
| 7-8 | 미션 | `/missions` | 375px | **PASS** | 날짜 + 통계 + 미션 체크카드 + 주간 그리드 + 관리 버튼 |
| 7-9 | 대시보드 | `/commute/dashboard` | 375px | **PASS** | 뒤로가기 + 빈 상태 + CTA |
| 7-10 | 로그인 | `/login` | 375px | **PASS** | 폼(이메일/비밀번호) + 비밀번호 토글 + 회원가입 전환 + 하단 네비 숨김 |
| 7-11 | 404 | `/nonexistent` | 375px | **PASS** | 404 코드 + 설명 + 홈/알림 링크 |

---

## 8. 기타 UX 패턴 검증

| # | Pattern | Result | Notes |
|---|---------|:------:|-------|
| 8-1 | 스킵 링크 (Skip to content) | **PASS** | 홈: `#weather-hero`, 로그인: `#auth-form` |
| 8-2 | 페이지 제목 (HTML title) | **PASS** | "출퇴근 메이트" (모든 페이지 동일) |
| 8-3 | 포커스 스타일 | **PASS** | `:focus-visible` 전역 정의: `outline: 2px solid var(--primary); outline-offset: 2px` |
| 8-4 | 버튼 포커스 | **PASS** | `box-shadow: 0 0 0 4px var(--primary-glow)` 추가 |
| 8-5 | 하단 네비 숨김 (로그인/온보딩) | **PASS** | `hiddenPaths: ['/login', '/onboarding', '/auth/callback']` |
| 8-6 | 페이지 lazy loading | **PASS** | `PREFETCH_MAP` + `onTouchStart`/`onMouseEnter` prefetch |
| 8-7 | 토스트 auto-dismiss | **PASS** | 4초 후 자동 소멸 + progress bar 애니메이션 |
| 8-8 | 확인 모달 (삭제 등) | **PASS** | `DeleteConfirmModal`, `ConfirmModal` 존재 |
| 8-9 | 드래그 앤 드롭 | **PASS** | `@dnd-kit/core` + `@dnd-kit/sortable` 경로 정류장 순서 변경 |
| 8-10 | 텍스트 말줄임 | **PASS** | `.route-path-clamp` (2줄 말줄임), `.mission-title` (text-overflow: ellipsis) |

---

## 발견된 이슈 요약

### WARN (경미, 기능 영향 없음) - 5건

| # | Issue | Severity | Location | Description |
|---|-------|----------|----------|-------------|
| W-1 | `.missions-back` 32x32px | LOW | `missions.css:20-22` | 터치 타겟 44px 미달. `min-width: 44px; min-height: 44px` 권장 |
| W-2 | `.msettings-back` 32x32px | LOW | `mission-settings.css:14-17` | 동일 이슈. `min-width: 44px; min-height: 44px` 권장 |
| W-3 | Toast 닫기 버튼 24x24px | LOW | `Toast.tsx:67-79` | `w-6 h-6` (24px). `min-w-[44px] min-h-[44px]` 또는 padding으로 터치 영역 확대 권장 |
| W-4 | 서버 API 404 에러 (streak, weeklyReport) | LOW | 배포 환경 콘솔 | streak/weeklyReport API 404 응답. UI에는 graceful fallback 표시 ("주간 리포트를 불러올 수 없습니다") |
| W-5 | 리포트 에러 상태에 재시도 버튼 없음 | LOW | `WeeklyReportCard.tsx:53-60`, `WeeklyTab` | "불러올 수 없습니다" 메시지만 표시, 재시도 CTA 없음. 홈 페이지의 `retryLoad` 패턴 참고 |

### 미해당 / 확인 불가

| # | Item | Status | Reason |
|---|------|--------|--------|
| N-1 | 가상 키보드 레이아웃 | N/A | 실제 모바일 기기 필요 (Playwright로 테스트 불가) |
| N-2 | 스크롤 성능 | N/A | 실제 디바이스 프로파일링 필요 |

---

## 결론

전체적으로 **잘 구축된 UI/UX 시스템**을 보유하고 있습니다.

**강점**:
- CSS 변수 기반 일관된 디자인 토큰 (색상, 간격, 그림자, radius)
- 모든 주요 페이지에 empty state + CTA 버튼 존재
- 로딩 상태에 skeleton/spinner 체계적 적용
- 에러 상태에 사용자 친화적 메시지 + 분류 처리 (401/403/network)
- 5단계 미디어 쿼리 (360px ~ 1200px) 반응형 대응
- `prefers-reduced-motion`, `forced-colors` 등 접근성 미디어 쿼리 지원
- 오프라인 배너, 토스트 시스템, 확인 모달 등 피드백 UI 완비

**개선 제안** (5건 모두 LOW severity):
- 미션 페이지 뒤로가기 버튼 터치 타겟 확대 (32px -> 44px)
- 토스트 닫기 버튼 터치 타겟 확대 (24px -> 44px)
- 리포트/주간 리포트 에러 시 재시도 버튼 추가
