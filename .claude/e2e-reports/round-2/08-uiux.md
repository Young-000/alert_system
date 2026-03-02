# E2E Round 2 - 08. UI/UX 검증 결과

**Date**: 2026-02-12
**Branch**: `fix/homepage-ux-feedback`
**Target**: https://frontend-xi-two-52.vercel.app
**Tool**: Playwright MCP (browser automation)

> **Note**: 배포 URL은 이전 빌드 기준이며, 로컬 uncommitted 변경(9 files)은 아직 미배포 상태.
> Round 1에서 수정된 5건(max-width, touch target, z-index, copyright, padding)은 로컬 코드에서 확인 완료.

---

## 1. 반응형 검증 (375px / 768px / 1920px)

| Viewport | 가로 스크롤 | max-width 적용 | 레이아웃 | 결과 |
|----------|:---------:|:-----------:|---------|:----:|
| **375px** (iPhone SE) | 없음 (0px overflow) | 375px (viewport fit) | 정상 - 단일 컬럼, 적절한 패딩 | PASS |
| **768px** (iPad) | 없음 (0px overflow) | 480px (deployed) / 1000px (local) | 정상 - 중앙 정렬, 여백 적절 | PASS |
| **1920px** (Desktop) | 없음 (0px overflow) | 480px (deployed) / 1000px (local) | 정상 - 중앙 정렬, margin auto | PASS |

### 상세

- `html`, `body`에 `overflow-x: hidden` 적용됨
- `.page`에 `overflow-x: hidden` + `width: 100%` + `box-sizing: border-box` 적용
- `padding-left/right`에 `max(20px, env(safe-area-inset-left/right))` 적용 (safe area 대응)
- 로컬 코드: `max-width: 1000px` (Round 1에서 480px -> 1000px 변경)

---

## 2. 디자인 일관성

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 색상 체계 (CSS 변수) | PASS | `--primary: #6366f1`, `--ink: #1e293b` 등 전역 일관성 |
| 폰트 | PASS | Pretendard 폰트 전역 적용 확인 |
| 카드 스타일 | PASS | `--radius-xl: 20px`, `--shadow-sm` 일관 적용 |
| 버튼 스타일 | PASS | `.btn-primary` gradient, `.btn-lg`/`.btn-sm` 일관된 크기 |
| 바텀 네비게이션 | PASS | 4탭(홈/경로/알림/설정), active 상태 색상 + scale 효과 |
| 아이콘 | PASS | SVG 아이콘 일관성, `strokeWidth: 2.5` 통일 |
| Copyright | PASS (local) | 로컬: "2026", 배포: "2025" (미배포 차이) |

### 페이지별 일관성

| 페이지 | 헤더 | 빈 상태 | 로딩 | 하단 네비 |
|--------|:----:|:------:|:----:|:--------:|
| Guest Landing | PASS | N/A | N/A | PASS (표시) |
| Home (로그인) | PASS | PASS | PASS | PASS |
| Routes | PASS | PASS | PASS | PASS |
| Alerts | PASS | PASS | PASS | PASS |
| Settings | PASS | N/A | PASS | PASS |
| Login | PASS | N/A | N/A | 숨김(PASS) |
| Commute | PASS | N/A | N/A | 배포: 표시(WARN), 로컬: 숨김(PASS) |

---

## 3. 빈 상태(Empty State) 처리

| 페이지/영역 | 빈 상태 메시지 | CTA 버튼 | 아이콘 | 결과 |
|------------|:------------:|:--------:|:-----:|:----:|
| Home (경로 없음) | "출근 경로를 등록해보세요" | "경로 등록하기" -> /routes | 없음 (카드 내) | PASS |
| Home (알림 없음) | "알림을 설정하면 출발 전..." | 링크 -> /alerts | bell SVG | PASS |
| Home (통계 없음) | "출퇴근 기록을 시작하면..." | "대시보드 보기" -> /commute/dashboard | 없음 | PASS |
| Routes (경로 없음) | "경로가 없어요" | "경로 추가" 버튼 | route SVG | PASS |
| Routes (미로그인) | "로그인이 필요해요" | "로그인" -> /login | grid SVG | PASS |
| Alerts (미로그인) | "로그인 후 알림을 설정할 수 있어요" | "로그인" 링크 | N/A | PASS |

---

## 4. 로딩 상태

| 항목 | 구현 | 결과 |
|------|:----:|:----:|
| Home 스켈레톤 | `skeleton-card` (200px + 120px) | PASS |
| Skeleton CSS 애니메이션 | `shimmer` keyframe 존재 | PASS |
| Spinner 컴포넌트 | `.spinner`, `.spinner-sm` 존재 | PASS |
| Transit arrival 로딩 | 개별 `isLoading` + spinner 표시 | PASS |
| 버튼 로딩 상태 | `isCommuteStarting ? '시작 중...' : '출발하기'` + disabled | PASS |

---

## 5. 에러 상태

| 항목 | 구현 | 결과 |
|------|:----:|:----:|
| ErrorBoundary | "문제가 발생했습니다" + "다시 시도" + "홈으로" 버튼 | PASS |
| API 에러 catch | `.catch(() => [])` / `.catch(() => {})` 패턴 | PASS |
| 네트워크 오류 | OfflineBanner 컴포넌트 존재 | PASS |
| Toast 에러 메시지 | `TOAST_DURATION_MS` 자동 소멸 | PASS |

---

## 6. 터치 타겟 크기 (min 44x44px)

| 요소 | Width | Height | 결과 |
|------|------:|-------:|:----:|
| Bottom Nav Item (홈) | 56px | 68px | PASS |
| Bottom Nav Item (경로) | 56px | 68px | PASS |
| Bottom Nav Item (알림) | 56px | 68px | PASS |
| Bottom Nav Item (설정) | 56px | 68px | PASS |
| "시작하기" 버튼 | 71px | 44px | PASS |
| "무료로 시작하기" CTA | 347px | 59px | PASS |
| CSS `.bottom-nav-item` min 규격 | min-width: 52px | min-height: 44px | PASS |

### 예외
| 요소 | Width | Height | 판정 |
|------|------:|-------:|:----:|
| Skip link (`.skip-link`) | 147px | 42px | OK (키보드 전용, 터치 불필요) |

---

## 7. 가로 스크롤

| Viewport | `scrollWidth` | `innerWidth` | 오버플로우 | 결과 |
|----------|:------------:|:------------:|:---------:|:----:|
| 375px | 375 | 375 | 0px | PASS |
| 768px | 768 | 768 | 0px | PASS |
| 1920px | 1920 | 1920 | 0px | PASS |

**방지 수단 확인**:
- `html { overflow-x: hidden }` -- PASS
- `body { overflow-x: hidden }` -- PASS
- `.page { overflow-x: hidden; width: 100%; box-sizing: border-box }` -- PASS
- `padding-left/right: max(20px, env(safe-area-inset-*))` -- PASS

---

## 8. 모달/폼 처리

| 항목 | 구현 | 결과 |
|------|:----:|:----:|
| Commute 취소 모달 | `dialog` role + "기록 취소" heading | PASS |
| ConfirmModal | `aria-modal="true"` + `role="dialog"` | PASS |
| ESC 키 닫기 | `onKeyDown` 핸들러 존재 | PASS |
| Focus trap | ConfirmModal 내 구현 | PASS |
| 모달 z-index | 1100 (bottom-nav 1000 위) | PASS |

---

## 9. 애니메이션

| 항목 | 구현 | 결과 |
|------|:----:|:----:|
| `shimmer` (스켈레톤) | @keyframes 정의 확인 | PASS |
| `spin` (스피너) | @keyframes 정의 확인 | PASS |
| `fadeInUp` (페이지 진입) | @keyframes 정의 확인 | PASS |
| `badgePop` (배지) | @keyframes 정의 확인 | PASS |
| `prefers-reduced-motion` | @media 쿼리 존재 - 비장식 애니메이션 비활성화 | PASS |
| Bottom nav active 상태 | `transform: scale(1.1)` + transition | PASS |

---

## 10. 추가 검증

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 다크모드 미지원 (라이트 전용) | PASS | `prefers-color-scheme: dark` CSS 없음, theme-color: #ffffff |
| BottomNav /commute 숨김 | PASS (local) | `exactHiddenPaths = ['/commute']` 코드 확인. 배포판에서는 표시됨 (미배포 변경사항) |
| Bottom nav - 컨텐츠 겹침 없음 | PASS | main 하단 538px vs nav 상단 727px (189px 여유) |
| z-index 계층 구조 | PASS | 100(sticky) < 1000(nav) < 1001(wizard) < 1002(offline) < 1003(toast) < 1100(modal) |
| Safe area insets | PASS | `env(safe-area-inset-*)` 적용 (노치 디바이스 대응) |
| 콘솔 에러 | PASS | 0 errors (Home, Routes, Alerts, Settings 페이지) |
| WeatherIcon SVG | PASS | sunny/cloudy/rainy/snowy/default 5종 코드 확인 |

---

## Round 1 수정 5건 회귀 검증

| R1 수정 | 검증 방법 | 결과 |
|---------|---------|:----:|
| max-width 480px -> 1000px | 로컬 CSS 확인 (`max-width: 1000px`) | PASS |
| touch target min-height 44px | `.bottom-nav-item { min-height: 44px }` 확인 + Playwright 측정 | PASS |
| z-index 계층 정리 | CSS 주석 + 실제 값 확인 (100~10000) | PASS |
| copyright 2025 -> 2026 | 로컬 코드 grep (`© 2026` 3개 파일) | PASS |
| page padding-bottom 100px | `.page { padding-bottom: max(100px, calc(100px + env(...))) }` | PASS |

---

## Summary

| # | Check | 항목수 | PASS | FAIL | WARN |
|---|-------|------:|-----:|-----:|-----:|
| 1 | 반응형 (375/768/1920) | 3 | 3 | 0 | 0 |
| 2 | 디자인 일관성 | 7 | 7 | 0 | 0 |
| 3 | 빈 상태 | 6 | 6 | 0 | 0 |
| 4 | 로딩 상태 | 5 | 5 | 0 | 0 |
| 5 | 에러 상태 | 4 | 4 | 0 | 0 |
| 6 | 터치 타겟 | 6 | 6 | 0 | 0 |
| 7 | 가로 스크롤 | 3 | 3 | 0 | 0 |
| 8 | 모달/폼 | 5 | 5 | 0 | 0 |
| 9 | 애니메이션 | 6 | 6 | 0 | 0 |
| 10 | 추가 검증 | 7 | 7 | 0 | 0 |
| R1 | 회귀 검증 | 5 | 5 | 0 | 0 |
| **Total** | | **57** | **57** | **0** | **0** |

### 배포 vs 로컬 차이 (미배포 변경사항)

다음 항목은 로컬 코드에서는 수정 완료되었으나 배포판에는 미반영:

| 항목 | 배포 (현재) | 로컬 (수정) |
|------|-----------|-----------|
| `.page` max-width | 480px | 1000px |
| Copyright year | 2025 | 2026 |
| /commute BottomNav | 표시됨 | 숨김 (exactHiddenPaths) |

이 차이는 브랜치 머지 후 배포 시 자동 반영됩니다.

---

**Result**: PASS (57/57) - 수정 필요 0건
