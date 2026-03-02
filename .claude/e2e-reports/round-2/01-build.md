# 01. Build - 빌드 검증 결과 (Round 2)

**Project**: alert_system (출퇴근 메이트)
**Branch**: `fix/homepage-ux-feedback`
**Date**: 2026-02-12
**Purpose**: Round 1에서 71건 수정 후 회귀(regression) 검증
**Status**: PASS

---

## 1-1. Frontend TypeScript 타입 체크

| 항목 | 결과 |
|------|------|
| **Command** | `cd frontend && npx tsc --noEmit` |
| **Status** | PASS |
| **Errors** | 0 |
| **Warnings** | 0 |
| **R1 대비** | 동일 (PASS -> PASS) |

> Round 1 quality 39건 수정 (any 타입 제거, 반환 타입 명시 등) 및 DbUser 인터페이스 변경이 타입 에러를 유발하지 않음 확인.

---

## 1-2. Frontend Vite 프로덕션 빌드

| 항목 | 결과 |
|------|------|
| **Command** | `cd frontend && npm run build` |
| **Status** | PASS |
| **Build Time** | 4.24s (app) + 352ms (service worker) |
| **Modules** | 121 modules transformed |
| **Output** | `frontend/dist/` |

### 빌드 결과물 상세

| File | Raw Size | Gzip Size |
|------|----------|-----------|
| `index-CxQNtE8p.js` (main bundle) | 230.36 KB | 77.29 KB |
| `RouteSetupPage-2oAbOlNu.js` | 78.95 KB | 23.71 KB |
| `AlertSettingsPage-DKx7MHu5.js` | 38.60 KB | 9.51 KB |
| `CommuteDashboardPage-Ch4T9Rcw.js` | 30.13 KB | 6.59 KB |
| `SettingsPage-C3Ph7J0-.js` | 20.03 KB | 5.05 KB |
| `OnboardingPage-D8Lj51zr.js` | 10.34 KB | 3.30 KB |
| `LoginPage-mvsvo3WS.js` | 6.66 KB | 2.76 KB |
| `CommuteTrackingPage-GYKK57mj.js` | 5.96 KB | 2.44 KB |
| `NotificationHistoryPage-DyE7yhfJ.js` | 3.81 KB | 1.67 KB |
| `AuthCallbackPage-CMjQsz6w.js` | 2.09 KB | 1.08 KB |
| `ConfirmModal-CqUITAtv.js` | 1.78 KB | 0.86 KB |
| `NotFoundPage-eD14MJx_.js` | 0.61 KB | 0.40 KB |
| `safe-storage-BJrRfgd_.js` | 0.17 KB | 0.16 KB |
| `index-D5WGyVqa.css` | 219.19 KB | 35.56 KB |
| `sw.js` (service worker) | 60.77 KB | 16.69 KB |

### R1 대비 번들 크기 변화

| Metric | R1 | R2 | Delta |
|--------|-----|-----|-------|
| Main bundle (gzip) | 79.28 KB | 77.29 KB | -1.99 KB |
| Total JS chunks | 12개 | 13개 | +1 (LoginPage 추가) |
| CSS (gzip) | 35.55 KB | 35.56 KB | +0.01 KB |
| PWA precache | 644.79 KB | 646.51 KB | +1.72 KB |
| SW (gzip) | 12.50 KB | 16.69 KB | +4.19 KB |

> Main bundle이 약 2KB 감소. LoginPage가 별도 chunk로 분리됨 (신규 lazy loading). CSS는 거의 동일. SW 크기 증가는 precache 엔트리 변경에 의한 것으로 정상 범위.

### 번들 크기 분석

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Total JS gzip | ~135 KB | < 500 KB | PASS |
| Total CSS gzip | 35.56 KB | - | OK |
| Main bundle gzip | 77.29 KB | - | OK |
| PWA precache | 646.51 KB | - | OK |

### 빌드 워닝

| Warning | Severity | Action |
|---------|----------|--------|
| Vite CJS Node API deprecated | INFO | Vite 6.x 업그레이드 시 해결. 현재 빌드에 영향 없음 |

---

## 1-3. Backend TypeScript 타입 체크

| 항목 | 결과 |
|------|------|
| **Command** | `cd backend && npx tsc --noEmit` |
| **Status** | PASS |
| **Errors** | 0 |
| **Warnings** | 0 |
| **R1 대비** | 동일 (PASS -> PASS) |

> push-subscription.entity.ts (p256dh/auth -> keys 컬럼) 변경이 Backend 타입 체크에 영향 없음 확인.

---

## 1-4. Backend NestJS 프로덕션 빌드

| 항목 | 결과 |
|------|------|
| **Command** | `cd backend && npm run build` (nest build) |
| **Status** | PASS |
| **Output** | `backend/dist/` (2.8MB) |
| **Entry Point** | `dist/src/main.js` |
| **R1 대비** | 동일 (PASS -> PASS) |

### 빌드 출력 구조
```
backend/dist/src/
  main.js          (entry point)
  application/     (use cases)
  domain/          (entities, interfaces)
  infrastructure/  (DB, external services)
  presentation/    (controllers, DTOs)
```

---

## 1-5. Frontend 빌드 결과물 크기 확인

| Metric | Value | Status |
|--------|-------|--------|
| Total gzip (JS + CSS) | ~170 KB | PASS (< 500KB) |
| Largest JS chunk (gzip) | index: 77.29 KB | OK |
| Largest page chunk (gzip) | RouteSetupPage: 23.71 KB | OK |
| CSS (gzip) | 35.56 KB | OK |

---

## 1-6. Backend Docker 이미지 빌드

| 항목 | 결과 |
|------|------|
| **Status** | SKIP |
| **Reason** | 로컬 Docker 환경 의존, CI/CD에서 검증 |

---

## 회귀 검증 결과

### 체크리스트 주의점 검증

| 주의점 | 결과 |
|--------|------|
| push-subscription.entity.ts (keys) 변경 -> Backend 빌드 영향 | 없음 (PASS) |
| client.ts (DbUser 인터페이스) 변경 -> Frontend 빌드 영향 | 없음 (PASS) |
| quality 39건 (any 제거, 반환 타입) -> 타입 에러 | 없음 (PASS) |
| performance 6건 (lazy, useMemo, memo) -> 번들 변화 | 정상 범위 (-2KB main bundle) |

---

## Summary

| # | Check | R1 | R2 | Notes |
|---|-------|:--:|:--:|-------|
| 1-1 | Frontend TypeScript 타입 체크 | PASS | PASS | 에러 0, 워닝 0 |
| 1-2 | Frontend Vite 프로덕션 빌드 | PASS | PASS | 4.24s, 121 modules, 13 chunks |
| 1-3 | Backend TypeScript 타입 체크 | PASS | PASS | 에러 0, 워닝 0 |
| 1-4 | Backend NestJS 프로덕션 빌드 | PASS | PASS | dist/ 2.8MB 정상 생성 |
| 1-5 | 빌드 결과물 크기 확인 | PASS | PASS | Total gzip ~170KB (< 500KB) |
| 1-6 | Docker 이미지 빌드 | SKIP | SKIP | 로컬 Docker 의존 |

**Result: 5/5 PASS, 0 FAIL, 1 SKIP**

### 수정 사항
- 수정 필요 항목 없음 (71건 수정 후에도 모든 빌드 및 타입 체크 통과)

### 참고 워닝
- Vite CJS Node API deprecated: Vite 5.x 알려진 이슈. 빌드 동작에 영향 없음.
