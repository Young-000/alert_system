# Code Quality Report — Round 7

**Date**: 2026-03-14
**Scope**: frontend/src, backend/src (test/mock files excluded)

---

## 검사 결과 요약

| 항목 | 결과 | 상세 |
|------|------|------|
| `any` 타입 | ✅ 없음 | frontend/backend 모두 0건 |
| `console.log` | ✅ 없음 | 0건 (warn/error만 사용) |
| TypeScript 오류 | ✅ 0건 | frontend: 0, backend: 0 |
| ESLint (frontend) | ✅ 0 errors/warnings | `--max-warnings 0` 통과 |
| ESLint (backend) | ✅ 0 errors/warnings | `--max-warnings 0` 통과 |
| 데드코드 | ⚠️ 1건 | `BehaviorEventType` enum → 수정됨 |
| 중복 코드 | ⚠️ 2건 | `getTrendArrow` 중복 → 수정됨 |
| 함수 길이 > 20줄 | ⚠️ frontend 147개, backend 122개 | 주로 UI JSX 반환 함수 (허용 범위) |
| 핸들러 네이밍 위반 | ⚠️ 8건 | `handle` 접두사 누락 (경미) |
| `eslint-disable` | ℹ️ 2건 | 의도적, 이유 명시됨 |
| TODO 주석 | ℹ️ 3건 | backend 미구현 기능 |

---

## 발견된 이슈 및 수정 내역

### 1. ✅ BehaviorEventType enum → as const + union 변환 (수정됨)

**파일**: `frontend/src/infrastructure/analytics/behavior-collector.ts`

**문제**: `enum` 사용 — 글로벌 컨벤션에 따라 `as const` + union 타입 선호.
또한 `TRANSIT_INFO_VIEWED` 외 6개 멤버가 파일 내에서 미사용 상태.

**수정**:
```typescript
// Before: enum (tree-shaking 안됨, 런타임 객체 생성)
export enum BehaviorEventType { ... }

// After: as const + union (tree-shaking 지원, 타입 안전)
export const BEHAVIOR_EVENT_TYPE = { ... } as const;
export type BehaviorEventType = typeof BEHAVIOR_EVENT_TYPE[keyof typeof BEHAVIOR_EVENT_TYPE];
```

### 2. ✅ getTrendArrow 중복 함수 추출 (수정됨)

**파일**:
- `frontend/src/presentation/pages/home/TrendIndicator.tsx`
- `frontend/src/presentation/pages/insights/RegionCard.tsx`

**문제**: 동일한 `getTrendArrow()` 함수가 두 파일에 중복 정의됨.
(`TrendDirection`과 `InsightTrendDirection`은 동일한 union 타입)

**수정**: 공유 유틸리티로 추출
```typescript
// 신규 파일: frontend/src/presentation/utils/trend.ts
export function getTrendArrow(trend: 'improving' | 'stable' | 'worsening'): string { ... }
```
두 파일에서 `import { getTrendArrow } from '../../utils/trend'`으로 교체.

---

## 미수정 이슈 (경미 / 의도적)

### 3. ⚠️ 핸들러 네이밍 컨벤션 경미 위반 (8건)

`handle` 접두사 없이 onClick에 바인딩된 함수들:

| 파일 | 핸들러명 | 비고 |
|------|---------|------|
| `LoginPage.tsx:257` | `toggleMode` | 토글 동작으로 의미 명확 |
| `CommuteDashboardPage.tsx:85` | `retryLoad` | 재시도 동작으로 의미 명확 |
| `RouteSetupPage.tsx:528` | `cancelCreating` | 취소 동작으로 의미 명확 |
| `OnboardingPage.tsx:232,269,298,353` | `goNext`, `goBack` | 네비게이션 의미 명확 |
| `OnboardingPage.tsx:359` | `createRouteFromOnboarding` | 명확한 동작 이름 |

→ 기능 동작에 문제 없음. 리팩토링 시 점진적 수정 권장.

### 4. ⚠️ 함수 길이 > 20줄 (frontend 147개, backend 122개)

대부분 UI JSX를 반환하는 React 컴포넌트 함수 (CommuteTrackingPage: ~401줄, LoginPage: ~264줄 등).
복잡한 UI 상태를 가진 Page 컴포넌트는 구조상 불가피.

**주요 리팩토링 후보**:
- `CommuteTrackingPage.tsx` (~401줄) — 여러 하위 컴포넌트 분리 검토
- `LoginPage.tsx` (~264줄) — 로그인/회원가입 폼을 별도 컴포넌트로 분리 검토

### 5. ℹ️ eslint-disable (2건, 의도적)

```typescript
// HomePage.tsx:35 — data.setForceRouteType은 stable setter, 포함 시 무한루프
}, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

// NotificationHistoryPage.tsx:157 — isMounted 패턴, deps 추가 불필요
}, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
```

### 6. ℹ️ TODO 주석 (3건, backend)

| 파일 | 내용 |
|------|------|
| `solapi.service.ts:210` | 주간 리포트 템플릿 승인 후 교체 |
| `live-activity-push.service.ts:94` | APNs HTTP/2 미구현 |
| `calculate-departure.use-case.ts:282` | LiveActivity 토큰 쿼리 미구현 |

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `frontend/src/infrastructure/analytics/behavior-collector.ts` | enum → as const + union 변환 |
| `frontend/src/presentation/utils/trend.ts` | getTrendArrow 공유 유틸리티 신규 생성 |
| `frontend/src/presentation/pages/home/TrendIndicator.tsx` | 중복 getTrendArrow 제거, 공유 유틸 import |
| `frontend/src/presentation/pages/insights/RegionCard.tsx` | 중복 getTrendArrow 제거, 공유 유틸 import |

---

## 검증

```
✅ frontend tsc --noEmit: 0 errors
✅ frontend eslint --max-warnings 0: 0 errors, 0 warnings
✅ backend tsc --noEmit: 0 errors
✅ backend eslint --max-warnings 0: 0 errors, 0 warnings
```
