# 05. Quality - 코드 품질 점검 결과

**Project**: alert_system (출퇴근 메이트)
**Branch**: `feature/e2e-auto-review-20260314`
**Date**: 2026-03-14

---

## 1. `any` 타입 사용

### Production Code

| 영역 | `: any` | `as any` | 결과 |
|------|:-------:|:--------:|:----:|
| Frontend (`src/`, non-test) | 0건 | 0건 | PASS |
| Backend (`src/`, non-test) | 0건 | 0건 | PASS |

### Test Code (허용)

Test 파일의 `as any`는 mock 객체 캐스팅 용도로 업계 표준 관행.
- Frontend: 0건
- Backend: ~50건 (`.spec.ts` mock data 캐스팅)

---

## 2. 미사용 변수/import

### 점검 방법
- `tsc --noEmit` (both FE/BE) → 0 errors
- `eslint --max-warnings=0` (both FE/BE) → 0 warnings

### 결과

```
Frontend tsc --noEmit: 0 errors
Backend  tsc --noEmit: 0 errors
Frontend lint:check:   0 errors, 0 warnings
Backend  lint:check:   0 errors, 0 warnings
```

False positive 확인:
- `type` import (`type KeyboardEvent`, `type ClassValue`, `type StopwatchRecord` 등)는 타입 어노테이션에 사용되어 실제 unused 아님
- `import type { Alert, CreateAlertDto, AlertType }` (RouteSetupPage.tsx) → 실제 사용 확인됨

---

## 3. 데드코드

| Check | Result |
|-------|--------|
| Unreachable code after return | 0건 |
| Unused exports | 0건 (production) |
| Commented-out code blocks | 0건 |

주석 처리된 코드 없음 (PROGRESS.md 관련 주석 제외).

---

## 4. console.log 잔재

| 영역 | `console.log` | `console.debug` | `console.info` | 결과 |
|------|:-------------:|:---------------:|:--------------:|:----:|
| Frontend production | 0건 | 0건 | 0건 | PASS |
| Backend production | 0건 | 0건 | 0건 | PASS |

Backend는 NestJS `Logger` 클래스를 정상 사용 중.

---

## 5. 중복 코드

### 동명 컴포넌트

`StationSearchStep.tsx`가 두 곳에 존재:
- `frontend/src/presentation/pages/alert-settings/StationSearchStep.tsx` (알림 설정용)
- `frontend/src/presentation/pages/route-setup/StationSearchStep.tsx` (경로 설정용)

차이 분석: Props 구조가 완전히 다름 (다른 use case를 처리). 이름 충돌이지만 중복 로직 아님 — 허용.

### 반복 패턴

핸들러 함수 이름 패턴 (`handleDeleteClick`, `handleEditClick`, `handleDeleteConfirm`)이 여러 페이지에서 반복됨. 이는 동일 네이밍 컨벤션을 따른 결과로, 중복 로직이 아님.

---

## 6. 함수 길이 (50줄 초과)

### 현황

| 파일 | 함수 | 길이 | 평가 |
|------|------|-----:|------|
| `RouteSetupPage.tsx` | `RouteSetupPage` | 609줄 | Page 컴포넌트, 여러 step 로직 포함 |
| `AlertSettingsPage.tsx` | `AlertSettingsPage` | 438줄 | Page 컴포넌트 |
| `OnboardingPage.tsx` | `OnboardingPage` | 424줄 | Page 컴포넌트 |
| `CommuteTrackingPage.tsx` | `CommuteTrackingPage` | 400줄 | Page 컴포넌트 |
| `MissionSettingsPage.tsx` | `MissionSettingsPage` | 329줄 | Page 컴포넌트 |
| `use-alert-crud.ts` | `useAlertCrud` | 249줄 | 커스텀 훅 |
| `buildDataSourceOptions` | backend config | 177줄 | DB 설정 함수 |

**평가**: 대형 페이지 컴포넌트는 React의 특성상 길어지는 경향 있음. 로직이 커스텀 훅으로 분리되어 있고 (useAlertCrud, useSettings, useHomeData 등), 구조적 문제 없음. 이번 리뷰 범위에서 컴포넌트 분리 리팩토링은 기능 변경 없는 대규모 수정이므로 제외.

---

## 7. 중첩 깊이 (3단계 이상)

JSX 렌더링 내 다중 조건 중첩이 탐지됨:
- `CommuteDashboardPage.tsx:134` — `setHistory` 내부 콜백
- `CommuteSection.tsx:147` — 실시간 교통 도착 표시

이는 JSX 내 콜백/삼항 연산자의 자연스러운 중첩으로, 로직 오류 없음. 허용.

---

## 8. 파라미터 수 (5개 초과)

Production 코드에서 5개 이상 파라미터를 가진 함수 없음.

---

## 9. 네이밍 컨벤션

### 수정된 위반 항목

#### `BottomNavigation.tsx` — 약어 변수명 (수정)

SVG 아이콘 렌더링 함수에서 약어 변수 사용 발견:
- `s` → stroke 색상 (`STROKE_ACTIVE` / `STROKE_INACTIVE`)
- `f` → fill 색상
- `SW` → strokeWidth 값

**수정**: 모든 단축 변수명을 의미 있는 이름으로 변경.

```diff
- const SW = 2.5;
+ const STROKE_WIDTH = 2.5;

- const s = active ? STROKE_ACTIVE : STROKE_INACTIVE;
+ const stroke = active ? STROKE_ACTIVE : STROKE_INACTIVE;

- const f = active ? 'var(--primary-light)' : 'none';
+ const fill = active ? 'var(--primary-light)' : 'none';
```

### 잔여 컨벤션 현황

| Category | Convention | Status |
|----------|-----------|:------:|
| 컴포넌트 파일 | PascalCase (`.tsx`) | PASS |
| 유틸/훅 파일 | camelCase (`use*.ts`) | PASS |
| 백엔드 파일 | kebab-case + suffix (`.controller.ts`, `.service.ts`) | PASS |
| 이벤트 핸들러 | `handle` prefix | PASS |
| 훅 | `use` prefix | PASS |
| 상수 | UPPER_SNAKE_CASE | PASS |
| 타입/인터페이스 | PascalCase | PASS |

---

## 10. `eslint-disable` 사용

### 수정된 항목

#### `HomePage.tsx:35` — `useEffect` 의존성 배열 lint 억제 (수정)

```diff
- }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
+ }, [mode, setForceRouteType]);
```

`data.setForceRouteType`을 직접 참조하여 `data` 객체 전체를 의존성 배열에서 제외했던 문제를 `setForceRouteType`을 구조 분해하여 해결.

#### `NotificationHistoryPage.tsx:157` — `useEffect` 의존성 배열 lint 억제 (주석 개선)

두 번째 `useEffect`가 `periodFilter` 변경을 처리하므로 첫 번째 `useEffect`에서 의도적으로 제외. 억제 이유를 명확히 설명하는 주석 추가.

```diff
- }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
+ // periodFilter intentionally excluded: period changes are handled by the second useEffect below
+ // eslint-disable-next-line react-hooks/exhaustive-deps
+ }, [userId]);
```

---

## 11. TODO/FIXME 잔재

Frontend: 0건
Backend: 5건 (모두 미래 기능 계획)

| # | File | TODO 내용 | 성격 |
|---|------|-----------|------|
| 1 | `live-activity-push.service.ts:78` | APNs HTTP/2 실구현 | 미래 기능 |
| 2 | `live-activity-push.service.ts:94` | APNs HTTP/2 push | 미래 기능 |
| 3 | `solapi.service.ts:210` | 주간 리포트 템플릿 승인 대기 | 외부 의존 |
| 4 | `calculate-departure.use-case.ts:256` | Live Activity 토큰 쿼리 | 미래 기능 |
| 5 | `calculate-departure.use-case.ts:282` | Live Activity 토큰 엔티티 | 미래 기능 |

모두 legitimate future work — 수정 불필요.

---

## 12. 최종 Lint & Type Check

```
Frontend lint:check:   PASS (0 errors, 0 warnings)
Frontend tsc --noEmit: PASS (0 errors)
Backend  lint:check:   PASS (0 errors, 0 warnings)
Backend  tsc --noEmit: PASS (0 errors)
```

---

## Summary

| Category | 발견 | 수정 | 스킵 | 상태 |
|----------|-----:|-----:|-----:|:----:|
| `any` 타입 (production) | 0건 | 0건 | 0건 | PASS |
| `any` 타입 (test) | ~50건 | 0건 | ~50건 (허용) | PASS |
| 미사용 변수/import | 0건 | 0건 | 0건 | PASS |
| 데드코드 | 0건 | 0건 | 0건 | PASS |
| console.log 잔재 | 0건 | 0건 | 0건 | PASS |
| 네이밍 컨벤션 위반 (약어) | 1건 | 1건 | 0건 | FIXED |
| eslint-disable 오용 | 2건 | 2건 | 0건 | FIXED |
| TODO/FIXME | 5건 | 0건 | 5건 (legitimate) | PASS |
| 함수 길이 초과 | 7건 | 0건 | 7건 (Page 컴포넌트) | INFO |
| Lint | 0건 | — | — | PASS |
| Type Check | 0건 | — | — | PASS |
| **Total** | **15건** | **3건** | **~62건** | **PASS** |

### 수정된 파일 (3 files)

- `frontend/src/presentation/components/BottomNavigation.tsx` — 약어 변수명 (`s`, `f`, `SW`) → 의미 있는 이름 (`stroke`, `fill`, `STROKE_WIDTH`)
- `frontend/src/presentation/pages/home/HomePage.tsx` — useEffect deps 배열 수정 (`eslint-disable-line` 제거, `setForceRouteType` 추가)
- `frontend/src/presentation/pages/NotificationHistoryPage.tsx` — eslint-disable 주석 형식 및 이유 설명 개선
