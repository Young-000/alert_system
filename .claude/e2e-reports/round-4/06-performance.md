# Performance & PWA Cache - E2E Round 4

## Round 3 수정 6건 반영 확인

### 1. skipWaiting + clientsClaim

| 항목 | 소스 (`sw.ts`) | 빌드 (`dist/sw.js`) | 상태 |
|------|---------------|---------------------|:----:|
| `self.skipWaiting()` | Line 15 | Line 1880 | OK |
| `clientsClaim()` | Line 16 (import from workbox-core) | Line 117 (`self.clients.claim()`) | OK |

### 2. cleanupOutdatedCaches

| 항목 | 소스 | 빌드 | 상태 |
|------|------|------|:----:|
| `cleanupOutdatedCaches()` | Line 19 | Line 1226-1230 (minified as `Ce()`) | OK |

### 3. NavigationRoute + NetworkFirst

| 항목 | 소스 | 빌드 | 상태 |
|------|------|------|:----:|
| `NetworkFirst` + `navigation-cache` | Lines 25-31 | Line 1886 | OK |
| `networkTimeoutSeconds: 3` | Line 28 | Line 1887 | OK |

### 4. SKIP_WAITING 메시지 핸들러

| 항목 | 소스 | 빌드 | 상태 |
|------|------|------|:----:|
| `message` listener | Lines 63-67 | Line 1913 | OK |

### 5. SW 업데이트 주기 체크 + 자동 리로드 (main.tsx)

| 항목 | 파일 | 상태 |
|------|------|:----:|
| `registration.update()` 60초 주기 | `main.tsx` Lines 14-20 | OK |
| `controllerchange` 리스너 | `main.tsx` Lines 24-28 | OK |
| `isRefreshing` 가드 | `main.tsx` Line 24 | OK |

### 6. vercel.json Cache-Control 헤더

| 파일 패턴 | Cache-Control | 상태 |
|-----------|--------------|:----:|
| `/index.html` | `no-cache, no-store, must-revalidate` | OK |
| `/sw.js` | `no-cache, no-store, must-revalidate` | OK |
| `/registerSW.js` | `no-cache, no-store, must-revalidate` | OK |
| `/manifest.webmanifest` | `no-cache, must-revalidate` | OK |
| `/assets/(.*)` | `public, max-age=31536000, immutable` | OK |

**Round 3 수정 6건 모두 반영 확인 완료.**

---

## Round 4 신규 발견 및 수정

### Fix 1: `public/sw.js` 레거시 파일 제거 (Medium)

**파일**: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/public/sw.js` (삭제)

**문제**: `public/sw.js`에 63줄짜리 레거시 서비스 워커가 남아 있었음. 이 파일은 VitePWA 도입 이전의 수동 캐시 로직으로, Workbox 기반 `src/sw.ts`와 완전히 별개.

Vite 빌드 시 `public/` 디렉토리 내 파일은 `dist/`에 그대로 복사됨. 현재 VitePWA가 마지막에 실행되어 `dist/sw.js`를 덮어쓰지만, 빌드 도구 버전 변경이나 설정 변경 시 복사 순서가 바뀌면 레거시 SW가 서빙될 위험이 있음.

**레거시 SW의 문제점**:
- `skipWaiting()`, `clientsClaim()` 없음 (activate 이벤트에서만 `clients.claim()`)
- Workbox precaching 없음 (수동 CACHE_NAME 관리)
- NetworkFirst 전략 없음 (단순 network-then-cache)
- 업데이트 감지 메커니즘 없음

**조치**: `public/sw.js` 파일 삭제. 빌드 후 `dist/sw.js`가 정상적으로 VitePWA 출력물(1944줄)인 것 확인.

---

## 재확인 항목

### Bundle Size

| 파일 | 크기 | gzip | Round 3 대비 |
|------|------|------|:----------:|
| `index.js` (main) | 230.63 KB | 77.41 KB | 동일 |
| `index.css` | 219.78 KB | 35.65 KB | 동일 |
| `sw.js` | 66.97 KB | 18.01 KB | 동일 |
| `RouteSetupPage.js` | 79.01 KB | 23.72 KB | 동일 |
| `AlertSettingsPage.js` | 38.62 KB | 9.52 KB | 동일 |
| `CommuteDashboardPage.js` | 30.13 KB | 6.59 KB | 동일 |
| `SettingsPage.js` | 20.03 KB | 5.05 KB | 동일 |
| `OnboardingPage.js` | 10.35 KB | 3.31 KB | 동일 |
| **Precache total** | **647.53 KiB** | - | 동일 |

- 번들 사이즈 변동 없음. 초기 로드 JS: 77.41 KB gzip (OK).

### Lazy Loading

| 페이지 | 로드 방식 | 상태 |
|--------|:---------:|:----:|
| HomePage | Eager | OK (랜딩) |
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

- 10/11 lazy load 유지. `useIdlePreload` 훅으로 RouteSetup, AlertSettings, Settings 2초 후 프리로드.

### VitePWA 설정

| 설정 | 값 | 상태 |
|------|-----|:----:|
| `strategies` | `injectManifest` | OK |
| `registerType` | `autoUpdate` | OK |
| `srcDir` | `src` | OK |
| `filename` | `sw.ts` | OK |
| `globPatterns` | `**/*.{js,css,html,ico,png,svg,woff2}` | OK |

### Caching Strategy

| 리소스 | 전략 | 캐시 이름 | 상태 |
|--------|------|----------|:----:|
| Precache (JS/CSS/HTML) | Precache + Revision | `workbox-precache-v2` | OK |
| Navigation (SPA) | NetworkFirst (3s timeout) | `navigation-cache` | OK |
| CDN 폰트 | CacheFirst (1년) | `font-cache` | OK |
| API (날씨/교통) | StaleWhileRevalidate (5분) | `api-cache` | OK |
| 정적 에셋 | Immutable (Vercel 헤더) | 브라우저 HTTP 캐시 | OK |

### 폰트 로딩 최적화

| 항목 | 구현 | 상태 |
|------|------|:----:|
| `preconnect` CDN | `<link rel="preconnect" href="https://cdn.jsdelivr.net">` | OK |
| `dns-prefetch` | `<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">` | OK |
| 비동기 로드 | `media="print" onload="this.media='all'"` | OK |
| noscript 폴백 | `<noscript>` 내 동기 로드 | OK |

### Build Verification

```
npm run build: SUCCESS
- tsc: OK (no type errors)
- vite build: OK (121 modules transformed)
- sw.js build: OK (87 modules transformed)
- precache: 22 entries (647.53 KiB)
```

---

## 참고 사항 (수정 불필요)

### Precache 중복 엔트리

`pwa-192x192.png`과 `pwa-512x512.png`이 precache 목록에 각각 2회 등장 (globPatterns + includeAssets). Workbox가 URL 기반 중복 제거를 수행하므로 실제 캐시 저장은 1회만 발생. `includeAssets`는 HTML에 `<link>` 태그도 추가하는 역할이 있어 제거하지 않음.

### bcryptjs 번들 포함

`bcryptjs`가 프론트엔드 번들에 포함됨 (auth.service.ts에서 클라이언트 사이드 패스워드 해싱). 기능적 설계 결정이므로 변경하지 않음.

### React.memo 미사용

컴포넌트 트리 깊이와 리렌더링 빈도를 고려할 때 현재 단계에서는 불필요. `useMemo`/`useCallback`은 10개 파일에서 적절히 사용 중.

---

## Summary

| # | 항목 | 파일 | 심각도 | 조치 |
|---|------|------|--------|------|
| 1 | `public/sw.js` 레거시 파일 제거 | `public/sw.js` | Medium | 삭제 |

**Round 3 수정 6건: 모두 반영 확인**
**Round 4 수정: 1건**
