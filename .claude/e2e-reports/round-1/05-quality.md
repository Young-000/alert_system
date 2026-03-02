# 05. Quality - 코드 품질 점검 결과

**Project**: alert_system (출퇴근 메이트)
**Branch**: `main`
**Date**: 2026-02-28

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

## 2. 미사용 변수/import (`tsc --noUnusedLocals --noUnusedParameters`)

### 수정 전 상태

Backend에서 13건의 unused variable/parameter 발견:

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `widget-data.service.ts:285` | `checkpointName` unused in `fetchSubwayArrival` | `_checkpointName` prefix |
| 2 | `calculate-route-analytics.use-case.ts:325` | `segmentStats` unused in `calculateScoreFactors` | `_segmentStats` prefix |
| 3 | `generate-weekly-report.use-case.ts:29` | `notificationLogRepo` injected but never used | Removed injection + import |
| 4 | `generate-weekly-report.use-case.ts:167` | `avgDuration` unused in `generateWeeklyTip` | `_avgDuration` prefix |
| 5 | `predict-optimal-departure.use-case.ts:45` | `patternAnalysisService` injected but never used | Removed injection + import |
| 6 | `process-commute-event.use-case.ts:241` | `placeType` unused in `createAutoSession` | `_placeType` prefix |
| 7 | `recommend-best-route.use-case.ts:26` | `logger` declared but never used | Removed field + `Logger` import |
| 8 | `google.strategy.ts:47` | `accessToken` unused (Passport callback) | `_accessToken` prefix |
| 9 | `google.strategy.ts:48` | `refreshToken` unused (Passport callback) | `_refreshToken` prefix |
| 10 | `postgres-alert.repository.ts:12` | `dataSource` stored as property but only used in constructor | Removed `private` keyword |
| 11 | `postgres-user.repository.ts:12` | Same pattern as above | Removed `private` keyword |
| 12 | `smart-departure.controller.ts:37` | `scheduleAlerts` injected but never used | Removed injection + import |
| 13 | `notification.module.ts:93` | `scheduler` injected but never used | Removed constructor + `Inject` import |

Frontend에서 3건 발견 (MissionSettingsPage.tsx):

| # | File | Issue | Fix |
|---|------|-------|-----|
| 14 | `MissionSettingsPage.tsx:267` | `deleteDialogRef` declared but never attached to DOM | Attached `ref={deleteDialogRef}` to dialog |
| 15 | `MissionSettingsPage.tsx:269` | `handleCancelDelete` used before declaration (TDZ) | Moved definition before `useFocusTrap` call |

### 수정 후 상태

```
Frontend tsc --noEmit --noUnusedLocals --noUnusedParameters: 0 errors
Backend  tsc --noEmit --noUnusedLocals --noUnusedParameters: 0 errors
```

---

## 3. 데드코드

| Check | Result |
|-------|--------|
| Unreachable code after return | 0건 |
| Unused exports | 0건 (production) |
| Commented-out code blocks | 0건 |

---

## 4. 컨벤션 위반

### 네이밍 컨벤션

| Category | Convention | Status |
|----------|-----------|:------:|
| 컴포넌트 파일 | PascalCase (`.tsx`) | PASS |
| 유틸/훅 파일 | camelCase (`use*.ts`) | PASS |
| 백엔드 파일 | kebab-case + suffix (`.controller.ts`, `.service.ts`) | PASS |
| 이벤트 핸들러 | `handle` prefix | PASS |
| 훅 | `use` prefix | PASS |
| 상수 | UPPER_SNAKE_CASE | PASS |
| 타입/인터페이스 | PascalCase | PASS |

### 파일 구조

| Check | Status |
|-------|:------:|
| Feature-based organization | PASS |
| Clean Architecture layers (backend) | PASS |
| Test colocation | PASS |

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
Backend: 5건 (모두 legitimate future work)

| # | File | TODO 내용 |
|---|------|-----------|
| 1 | `live-activity-push.service.ts:78` | APNs HTTP/2 구현 (미래 기능) |
| 2 | `live-activity-push.service.ts:94` | APNs HTTP/2 push 구현 (미래 기능) |
| 3 | `solapi.service.ts:210` | 주간 리포트 템플릿 승인 대기 |
| 4 | `calculate-departure.use-case.ts:256` | Live Activity 토큰 쿼리 (미래 기능) |
| 5 | `calculate-departure.use-case.ts:282` | Live Activity 토큰 엔티티 (미래 기능) |

---

## 7. Lint & Type Check

```
Frontend lint:check:  PASS (0 errors, 0 warnings)
Frontend tsc --noEmit: PASS (0 errors)
Backend  lint:check:  PASS (0 errors, 0 warnings)
Backend  tsc --noEmit: PASS (0 errors)
```

---

## 8. Test Verification (수정 후)

```
Backend:  892 passed, 10 skipped, 75/78 suites passed (6.7s)
Frontend: 480 passed, 35/35 suites passed (5.7s)
```

모든 테스트 통과 확인.

---

## Summary

| Category | Found | Fixed | Skipped | Status |
|----------|------:|------:|--------:|:------:|
| `any` 타입 (production) | 0 | 0 | 0 | PASS |
| `any` 타입 (test) | ~51 | 0 | ~51 (허용) | PASS |
| 미사용 변수/import (BE) | 13 | 13 | 0 | FIXED |
| 미사용 변수 + TDZ 버그 (FE) | 2 | 2 | 0 | FIXED |
| 데드코드 | 0 | 0 | 0 | PASS |
| 네이밍 컨벤션 | 0 | 0 | 0 | PASS |
| 파일 구조 | 0 | 0 | 0 | PASS |
| console.log 잔재 | 0 | 0 | 0 | PASS |
| TODO/FIXME | 5 | 0 | 5 (legitimate) | PASS |
| Lint | 0 | 0 | 0 | PASS |
| Type Check | 0 | 0 | 0 | PASS |
| **Total** | **15** | **15** | **~56** | **PASS** |

### Modified Files (12 files)

**Backend (10 files)**:
- `backend/src/application/services/widget-data.service.ts` - `_checkpointName` prefix
- `backend/src/application/use-cases/calculate-route-analytics.use-case.ts` - `_segmentStats` prefix
- `backend/src/application/use-cases/generate-weekly-report.use-case.ts` - removed unused `notificationLogRepo` injection + import, `_avgDuration` prefix
- `backend/src/application/use-cases/predict-optimal-departure.use-case.ts` - removed unused `patternAnalysisService` injection + import
- `backend/src/application/use-cases/process-commute-event.use-case.ts` - `_placeType` prefix
- `backend/src/application/use-cases/recommend-best-route.use-case.ts` - removed unused `logger` + `Logger` import
- `backend/src/infrastructure/auth/google.strategy.ts` - `_accessToken`, `_refreshToken` prefix
- `backend/src/infrastructure/persistence/postgres-alert.repository.ts` - removed `private` from constructor param
- `backend/src/infrastructure/persistence/postgres-user.repository.ts` - removed `private` from constructor param
- `backend/src/presentation/controllers/smart-departure.controller.ts` - removed unused `scheduleAlerts` injection + import
- `backend/src/presentation/modules/notification.module.ts` - removed unused constructor + `Inject` import

**Frontend (1 file)**:
- `frontend/src/presentation/pages/missions/MissionSettingsPage.tsx` - fixed TDZ bug (moved `handleCancelDelete` before `useFocusTrap`), attached `deleteDialogRef` to dialog DOM element
