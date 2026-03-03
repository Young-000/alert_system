# Performance & PWA Cache - E2E Round 3

## PWA Service Worker Cache Issue (Critical Fix)

### Problem
모바일 새로고침 시 이전 버전이 표시되는 문제. 서비스 워커가 업데이트되어도 기존 SW가 계속 페이지를 제어하여 구버전 에셋을 서빙.

### Root Cause Analysis

| # | 원인 | 심각도 | 파일 |
|---|------|--------|------|
| 1 | `skipWaiting()` 미사용 - 새 SW가 대기 상태에 머무름 | Critical | `sw.ts` |
| 2 | `clientsClaim()` 미사용 - 활성화된 새 SW가 기존 탭을 제어하지 않음 | Critical | `sw.ts` |
| 3 | HTML/SW 파일에 캐시 무효화 헤더 없음 - 브라우저가 구버전 캐시 사용 | High | `vercel.json` |
| 4 | SW 업데이트 감지 및 자동 갱신 로직 부재 | High | `main.tsx` |
| 5 | Navigation 요청에 대한 NetworkFirst 전략 부재 | Medium | `sw.ts` |
| 6 | 오래된 precache 엔트리 정리 로직 부재 | Low | `sw.ts` |

### Fixes Applied

#### Fix 1: `sw.ts` - skipWaiting + clientsClaim 추가 (Critical)
**파일**: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/sw.ts`

```typescript
// BEFORE: 없음
// AFTER:
import { clientsClaim } from 'workbox-core';

self.skipWaiting();      // 새 SW 즉시 활성화 (대기 상태 건너뜀)
clientsClaim();          // 활성화 시 모든 탭 즉시 제어
```

- `skipWaiting()`: 새 서비스 워커가 설치되면 즉시 활성화 단계로 진입. 기존에는 모든 탭이 닫힐 때까지 대기 상태에 머물러 구버전이 계속 서빙됨.
- `clientsClaim()`: 활성화 즉시 현재 열린 모든 클라이언트(탭)를 제어. 기존에는 다음 새로고침까지 이전 SW가 제어권 유지.

#### Fix 2: `sw.ts` - cleanupOutdatedCaches 추가
```typescript
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

cleanupOutdatedCaches(); // 이전 버전의 precache 엔트리 자동 정리
```

#### Fix 3: `sw.ts` - NavigationRoute with NetworkFirst 추가
```typescript
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigation-cache',
    networkTimeoutSeconds: 3, // 3초 이내 응답 없으면 캐시 사용
  }),
);
registerRoute(navigationRoute);
```

- SPA 네비게이션 요청에 NetworkFirst 전략 적용. 온라인 시 항상 최신 HTML 제공, 오프라인 시에만 캐시 사용.

#### Fix 4: `sw.ts` - SKIP_WAITING 메시지 핸들러 추가
```typescript
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

- 클라이언트에서 `SKIP_WAITING` 메시지를 보내 대기 중인 SW를 강제 활성화할 수 있는 폴백 메커니즘.

#### Fix 5: `main.tsx` - SW 업데이트 감지 및 자동 리프레시
**파일**: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/src/main.tsx`

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    // 60초마다 SW 업데이트 체크
    setInterval(() => {
      registration.update().catch(() => {});
    }, 60 * 1000);
  });

  // 새 SW가 제어권을 가져오면 자동 리로드
  let isRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
  });
}
```

- `registration.update()`: 60초 주기로 서버에 새 SW 파일 있는지 확인
- `controllerchange`: 새 SW가 활성화되면 자동 페이지 리로드로 최신 에셋 로드
- `isRefreshing` 가드: 중복 리로드 방지

#### Fix 6: `vercel.json` - Cache-Control 헤더 설정
**파일**: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/vercel.json`

| 파일 | Cache-Control | 이유 |
|------|--------------|------|
| `/index.html` | `no-cache, no-store, must-revalidate` | 항상 최신 HTML 제공 |
| `/sw.js` | `no-cache, no-store, must-revalidate` | SW 업데이트 즉시 감지 |
| `/registerSW.js` | `no-cache, no-store, must-revalidate` | SW 등록 스크립트 최신 유지 |
| `/manifest.webmanifest` | `no-cache, must-revalidate` | 매니페스트 변경 감지 |
| `/assets/(.*)` | `public, max-age=31536000, immutable` | content hash 기반 정적 에셋 (1년 캐시) |

---

## Additional Performance Checks

### Bundle Size Analysis

| 파일 | 크기 | gzip | 상태 |
|------|------|------|------|
| `index.js` (main bundle) | 230.61 KB | 77.41 KB | OK |
| `index.css` | 219.19 KB | 35.56 KB | OK |
| `sw.js` | 66.97 KB | 18.01 KB | OK |
| `RouteSetupPage.js` | 78.97 KB | 23.72 KB | Largest page chunk |
| `AlertSettingsPage.js` | 38.60 KB | 9.51 KB | OK |
| **Total precache** | **646.85 KB** | - | OK (< 1MB) |

- 전체 gzip 번들 사이즈는 적정 수준. 500KB gzip 미만 기준 대비 다소 크지만, 코드 분할이 잘 적용되어 초기 로드에 필요한 크기는 합리적.

### Lazy Loading

| 페이지 | Lazy Load | 비고 |
|--------|:---------:|------|
| HomePage | Eager | 랜딩 페이지이므로 즉시 로드 (정상) |
| LoginPage | Lazy | OK |
| AlertSettingsPage | Lazy | OK |
| AuthCallbackPage | Lazy | OK |
| NotFoundPage | Lazy | OK |
| SettingsPage | Lazy | OK |
| RouteSetupPage | Lazy | OK |
| CommuteTrackingPage | Lazy | OK |
| CommuteDashboardPage | Lazy | OK |
| OnboardingPage | Lazy | OK |
| NotificationHistoryPage | Lazy | OK |

- 10/11 페이지에 lazy loading 적용 완료. HomePage만 eager load (정상 설계).
- `useIdlePreload` 훅으로 주요 페이지(RouteSetup, AlertSettings, Settings) 2초 후 백그라운드 프리로드.

### React.memo Usage

- 현재 사용 안 함. 이 프로젝트의 컴포넌트 트리 깊이와 리렌더링 빈도를 고려하면 현재 단계에서는 불필요. 성능 병목 발생 시 선택적으로 적용 권장.

### Caching Strategy Summary

| 리소스 타입 | 전략 | 캐시 이름 |
|------------|------|----------|
| Precache (JS/CSS/HTML) | Precache + Revision | `workbox-precache-v2` |
| Navigation (SPA) | NetworkFirst (3s timeout) | `navigation-cache` |
| CDN 폰트 | CacheFirst (1년) | `font-cache` |
| API 응답 (날씨/교통) | StaleWhileRevalidate (5분) | `api-cache` |
| 정적 에셋 (/assets/) | Immutable (Vercel 헤더) | 브라우저 HTTP 캐시 |

---

## VitePWA Configuration

| 설정 | 값 | 상태 |
|------|-----|:----:|
| `strategies` | `injectManifest` | OK |
| `registerType` | `autoUpdate` | OK |
| `srcDir` | `src` | OK |
| `filename` | `sw.ts` | OK |
| `globPatterns` | `**/*.{js,css,html,ico,png,svg,woff2}` | OK |

---

## Build Verification

```
npm run build: SUCCESS
- tsc: OK (no type errors)
- vite build: OK (121 modules transformed)
- sw.js build: OK (87 modules transformed)
- precache: 22 entries (646.85 KiB)
```

Built SW (`dist/sw.js`) 확인 결과:
- `self.skipWaiting()` -- line 1880
- `self.clients.claim()` (via clientsClaim) -- line 117
- `SKIP_WAITING` message handler -- line 1913
- `navigation-cache` with NetworkFirst -- line 1886

Built main bundle (`dist/assets/index-*.js`) 확인 결과:
- `controllerchange` event listener -- confirmed
- `registration.update()` periodic check -- confirmed

---

## Summary

| # | 수정 항목 | 파일 | 심각도 |
|---|----------|------|--------|
| 1 | `skipWaiting()` + `clientsClaim()` 추가 | `sw.ts` | Critical |
| 2 | `cleanupOutdatedCaches()` 추가 | `sw.ts` | Low |
| 3 | NavigationRoute + NetworkFirst 추가 | `sw.ts` | Medium |
| 4 | `SKIP_WAITING` 메시지 핸들러 추가 | `sw.ts` | Low |
| 5 | SW 업데이트 주기 체크 + 자동 리로드 | `main.tsx` | High |
| 6 | Cache-Control 헤더 설정 (5개 규칙) | `vercel.json` | High |

**Total: 6 fixes across 3 files**
