# 05. Quality - 코드 품질 점검 결과

**Project**: alert_system (출퇴근 메이트)
**Branch**: `feature/e2e-auto-review-20260303`
**Date**: 2026-03-03

---

## 1. `any` 타입 사용

### Production Code

| 영역 | `: any` | `as any` | 결과 |
|------|:-------:|:--------:|:----:|
| Frontend (`src/`) | 0건 | 0건 | PASS |
| Backend (`src/`, `.spec.ts` 제외) | 0건 | 0건 | PASS |

### Test Code (허용)

Test 파일의 `as any`는 mock 객체 캐스팅 용도로 업계 표준 관행.
- Frontend: 1건 (`error-logger.test.ts` - eslint-disable 주석 포함)
- Backend: ~50건 (`.spec.ts` mock data 캐스팅)

---

## 2. 미사용 변수/import

### TypeScript Strict Check

```
Frontend tsc --noEmit: 0 errors
Backend  tsc --noEmit: 0 errors
```

### PlacesTab.tsx 버그 수정 (자동 복구 확인)

PlacesTab.tsx에서 이전에 발생했던 4건의 이슈(미사용 import, 미사용 변수, 미참조 함수)가 자동 복구됨:
- `ConfirmModal` import: 사용 중 (삭제 확인 모달로 렌더링)
- `actionError` state: 사용 중 (에러 메시지 표시)
- `handleDeleteConfirm`: 사용 중 (ConfirmModal onConfirm)
- `handleDelete` -> `setDeleteConfirmId`: 올바르게 연결됨

---

## 3. 데드코드

### Unused Exports (Production)

| 영역 | 항목 | 상태 | 비고 |
|------|------|:----:|------|
| Frontend | `ConfirmSummaryRow` | 권고 | 컴포넌트 API 확장용 (향후 사용 가능) |
| Frontend | `LineChip` | 권고 | UI 컴포넌트 (향후 사용 가능) |
| Frontend | `ToggleSwitch` | 권고 | UI 컴포넌트 (향후 사용 가능) |
| Frontend | `useBriefingQuery` | 권고 | Query hook (향후 사용 가능) |
| Frontend | `useMilestonesQuery` | 권고 | Query hook (향후 사용 가능) |
| Frontend | `useRegionTrends` | 권고 | Query hook (향후 사용 가능) |
| Backend | `ALTERNATIVE_MAPPING_SEEDS` | 권고 | Seed data (DB init용) |
| Backend | `CONGESTION_LEVEL_LABELS` | 권고 | Domain constant (향후 UI 연동) |
| Backend | `ENHANCED_PATTERN_ANALYSIS_SERVICE` | 권고 | DI token (아키텍처 확장용) |
| Backend | `PREDICTION_ENGINE_SERVICE` | 권고 | DI token (아키텍처 확장용) |
| Backend | `getTopRecommendations` | 권고 | Domain utility (향후 사용 가능) |
| Backend | `hasWeatherData` / `hasAirQualityData` / `hasTransitData` / `hasBothTransitModes` | 권고 | Type guard 함수 (향후 사용 가능) |
| Backend | `subwayStationsSeed` | 권고 | Seed data (DB init용) |

위 항목들은 모두 도메인 유틸리티, 아키텍처 스캐폴딩, 또는 향후 기능 확장을 위한 public API로, 현시점에서 삭제하지 않음.

### Other Dead Code Checks

| Check | Result |
|-------|--------|
| Unreachable code after return | 0건 |
| Commented-out code blocks | 0건 |

---

## 4. 컨벤션 위반

### 네이밍 컨벤션

| Category | Convention | Status |
|----------|-----------|:------:|
| 컴포넌트 파일 | PascalCase (`.tsx`) | PASS |
| 유틸/훅 파일 | kebab-case (`use-*.ts`) | PASS |
| 백엔드 파일 | kebab-case + suffix (`.controller.ts`, `.service.ts`) | PASS |
| 이벤트 핸들러 | `handle` prefix | PASS |
| 훅 | `use` prefix | PASS |
| 상수 | UPPER_SNAKE_CASE | PASS |
| 타입/인터페이스 | PascalCase | PASS |

### 에러 변수 네이밍 불일치 (수정 완료)

| # | File | Before | After |
|---|------|--------|-------|
| 1 | `send-notification.use-case.ts:394` | `catch (err)` | `catch (error)` |

전체 코드베이스에서 `catch (error)` 패턴으로 통일됨.

### 매직 넘버 (수정 완료)

| # | File | Before | After |
|---|------|--------|-------|
| 2 | `RouteSetupPage.tsx:384` | `setTimeout(..., 1500)` | `setTimeout(..., NAVIGATE_DELAY_MS)` |
| 3 | `AuthCallbackPage.tsx:43` | `setTimeout(..., 3000)` | `setTimeout(..., ERROR_REDIRECT_DELAY_MS)` |
| 4 | `AuthCallbackPage.tsx:61` | `setTimeout(..., 500)` | `setTimeout(..., SUCCESS_REDIRECT_DELAY_MS)` |
| 5 | `AuthCallbackPage.tsx:65` | `setTimeout(..., 3000)` | `setTimeout(..., ERROR_REDIRECT_DELAY_MS)` |

### 인라인 스타일 (수정 완료)

| # | File | Before | After |
|---|------|--------|-------|
| 6 | `AuthCallbackPage.tsx:76` | `style={{ textAlign: 'center' }}` | `className="text-center"` |

### 파일 구조

| Check | Status |
|-------|:------:|
| Feature-based organization | PASS |
| Clean Architecture layers (backend) | PASS |
| Test colocation | PASS |

### ESLint Disable 주석

2건 확인 (모두 합리적):
- `HomePage.tsx:35` - `react-hooks/exhaustive-deps` (stable ref 제외)
- `NotificationHistoryPage.tsx:158` - `react-hooks/exhaustive-deps` (load 함수 제외)

---

## 5. console.log 잔재

| 영역 | `console.log` | `console.debug` | `console.info` | 결과 |
|------|:-------------:|:---------------:|:--------------:|:----:|
| Frontend production | 0건 | 0건 | 0건 | PASS |
| Backend production | 0건 | 0건 | 0건 | PASS |

Backend는 NestJS `Logger` 클래스를 정상 사용 중.

---

## 6. TODO/FIXME 잔재

Frontend: 0건
Backend: 3건 (모두 legitimate future work)

| # | File | TODO 내용 |
|---|------|-----------|
| 1 | `calculate-departure.use-case.ts:262` | Live Activity 토큰 쿼리 (미래 기능) |
| 2 | `live-activity-push.service.ts:91` | APNs HTTP/2 push 구현 (미래 기능) |
| 3 | `solapi.service.ts:240` | 주간 리포트 템플릿 승인 대기 |

---

## 7. TypeScript Strict Mode

### Frontend (`tsconfig.json`)
- `"strict": true` -- 완전 strict mode 활성화

### Backend (`tsconfig.json`)
- 개별 strict 옵션 설정: `strictNullChecks`, `noImplicitAny`, `strictBindCallApply`
- `useUnknownInCatchVariables`: 미설정 (catch 변수가 암묵적 `any`)
  - 일부 파일(4건)은 명시적 `catch (error: unknown)` 사용
  - 나머지 ~20건은 `catch (error)` (암묵적 `any` -- NestJS Logger로 전달하므로 실질적 위험 낮음)
  - **권고**: `useUnknownInCatchVariables: true` 추가 고려 (별도 브랜치에서 진행)

---

## 8. Lint & Type Check

```
Frontend lint:check:  PASS (0 errors, 0 warnings)
Frontend tsc --noEmit: PASS (0 errors)
Backend  lint:check:  PASS (0 errors, 0 warnings)
Backend  tsc --noEmit: PASS (0 errors)
```

---

## 9. 중복 코드 패턴

| Check | Result |
|-------|--------|
| 에러 핸들링 패턴 통일 | PASS (catch 변수명 통일 완료) |
| Import 순서 | PASS (외부 -> 내부 -> 상대 -> 타입 순서) |
| API 호출 패턴 | PASS (api-client 래퍼 사용) |
| 상태 관리 패턴 | PASS (React Query 통일) |

---

## 10. Build & Test Verification (수정 후)

```
Frontend tsc --noEmit:   PASS (0 errors)
Frontend lint:           PASS (0 errors)
Frontend vitest run:     607 passed, 48 suites (8.02s)
Frontend vite build:     PASS (~168KB gzip)

Backend tsc --noEmit:    PASS (0 errors)
Backend lint:            PASS (0 errors)
Backend jest:            1,348 passed, 10 skipped, 101 suites (21.5s)
```

---

## Summary

| Category | Found | Fixed | Skipped | Status |
|----------|------:|------:|--------:|:------:|
| `any` 타입 (production) | 0 | 0 | 0 | PASS |
| `any` 타입 (test) | ~51 | 0 | ~51 (허용) | PASS |
| 미사용 변수/import | 0 | 0 | 0 | PASS |
| 데드코드 (unused exports) | ~15 | 0 | ~15 (권고) | PASS |
| 에러 변수 네이밍 불일치 | 1 | 1 | 0 | FIXED |
| 매직 넘버 | 4 | 4 | 0 | FIXED |
| 인라인 스타일 | 1 | 1 | 0 | FIXED |
| console.log 잔재 | 0 | 0 | 0 | PASS |
| TODO/FIXME | 3 | 0 | 3 (legitimate) | PASS |
| Lint | 0 | 0 | 0 | PASS |
| Type Check | 0 | 0 | 0 | PASS |
| 중복 코드 | 0 | 0 | 0 | PASS |
| **Total** | **6** | **6** | **~69** | **PASS** |

### Modified Files (4 files)

**Backend (1 file)**:
- `backend/src/application/use-cases/send-notification.use-case.ts` - `catch (err)` -> `catch (error)` 변수명 통일

**Frontend (3 files)**:
- `frontend/src/presentation/pages/AuthCallbackPage.tsx` - 매직 넘버 상수화 (`ERROR_REDIRECT_DELAY_MS`, `SUCCESS_REDIRECT_DELAY_MS`), 인라인 스타일 -> Tailwind 클래스
- `frontend/src/presentation/pages/RouteSetupPage.tsx` - 매직 넘버 상수화 (`NAVIGATE_DELAY_MS`)
- `frontend/src/presentation/pages/settings/PlacesTab.tsx` - 자동 복구 확인 (ConfirmModal 연결, actionError 표시, handleDelete 수정)
