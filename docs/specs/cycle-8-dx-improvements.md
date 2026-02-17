# Cycle 8: DX Improvements -- Jest to Vitest Migration + SVG Icon System

> Spec 작성: 2026-02-17
> 대상 아이템: N-1 (RICE 40) + N-2 (RICE 40)
> 노력 추정: M (1 cycle)

---

## JTBD

### N-1: Jest to Vitest Migration
When **개발자가 프론트엔드 테스트를 작성/실행할 때**, I want to **Vite 네이티브 테스트 러너(Vitest)를 사용하고**, so I can **`import.meta.env` 해킹 없이 테스트를 작성하고 글로벌 컨벤션에 맞는 도구를 사용할 수 있다.**

### N-2: SVG Icon System
When **컴포넌트를 작성하면서 아이콘이 필요할 때**, I want to **공유 Icon 컴포넌트에서 아이콘을 가져다 쓰고**, so I can **인라인 SVG를 복붙하지 않고 일관된 크기/색상/접근성을 보장할 수 있다.**

---

## Problem

### N-1: Jest to Vitest

- **Who:** 이 프로젝트의 프론트엔드 개발자 (모든 기여자)
- **Pain:** 중간 (매 테스트 작성 시 반복).
  - `import.meta.env`를 Jest에서 사용하려면 `ts-jest-mock-import-meta` AST 트랜스포머 + `setupTests.ts`에 수동 `Object.defineProperty` 해킹이 필요하다.
  - `jest.fn()` 글로벌이 mock 파일에서 사용되지만, 타입이 `@types/jest`에 의존한다. Vitest의 `vi.fn()`은 Vite와 동일한 타입 시스템을 사용한다.
  - 글로벌 CLAUDE.md 컨벤션이 "Vite 프로젝트: Vitest" 사용을 명시한다. 현재 Jest 사용은 컨벤션 위반이다.
  - `ts-jest` 프리셋 + `identity-obj-proxy` + `transformIgnorePatterns` 등 Jest-specific 설정이 5개 이상의 workaround를 필요로 한다.
- **Current workaround:** `ts-jest-mock-import-meta`, `identity-obj-proxy`, `transformIgnorePatterns: [uuid]` 등 Jest 설정 해킹으로 Vite 프로젝트를 억지로 Jest에서 테스트하고 있다.
- **Success metric:** `vitest run` 명령으로 기존 158개 프론트엔드 테스트가 모두 통과하고, Jest 관련 devDependencies가 0개가 된다.

### N-2: SVG Icon System

- **Who:** 이 프로젝트의 프론트엔드 개발자 + UI 일관성을 신경 쓰는 PD
- **Pain:** 중간 (매 컴포넌트 작성 시 반복).
  - 현재 49개 파일에 136개의 인라인 `<svg>` 태그가 산재해 있다.
  - `ChevronIcon` 컴포넌트가 `WeatherHeroSection.tsx`와 `StatsSection.tsx`에 동일한 코드로 중복 정의되어 있다 (Cycle 7에서 식별된 기술 부채).
  - `BottomNavigation.tsx`에 `HomeIcon`, `RouteIcon`, `BellIcon`, `SettingsIcon` 4개가 로컬 정의되어 있어 다른 곳에서 재사용 불가.
  - 아이콘별로 `aria-hidden`, `strokeWidth`, `viewBox` 등 속성이 제각각이다. 접근성/일관성 보장이 안 된다.
- **Current workaround:** 필요할 때마다 인라인 SVG를 복붙하고, 각 파일에서 개별적으로 크기/색상을 하드코딩한다.
- **Success metric:** 공유 `Icon` 컴포넌트가 존재하고, 기존 `ChevronIcon` 2곳의 중복이 제거되며, 새로 추가하는 아이콘은 아이콘 시스템을 통해서만 추가한다.

---

## Solution

### Overview

두 아이템은 순차적으로 수행한다. Vitest 마이그레이션을 먼저 완료한 후 (테스트 인프라 안정화), Icon 시스템을 구축하면서 새 테스트를 Vitest로 작성한다.

**N-1 (Vitest 마이그레이션):** `jest.config.js` + `ts-jest` + `@types/jest` + `identity-obj-proxy` + `ts-jest-mock-import-meta`를 제거하고, `vitest.config.ts`로 교체한다. Vitest는 Vite의 `resolve.alias`, `define`, 플러그인을 그대로 재사용하므로 `import.meta.env` 해킹이 불필요하다. mock 파일의 `jest.fn()`을 `vi.fn()`으로 교체한다.

**N-2 (Icon 시스템):** `presentation/components/icons/` 디렉토리에 공유 아이콘 컴포넌트를 구축한다. 자주 쓰이는 아이콘(Chevron, Check, MapPin, Search, Plus, Close, Warning, Bell, Home, Route, Settings)을 먼저 추출하고, 중복된 `ChevronIcon` 2곳을 공유 컴포넌트로 교체한다. 이번 사이클에서 전체 136개 인라인 SVG를 교체하지는 않는다 (점진적 마이그레이션).

### User Flow (개발자 워크플로우)

**N-1:**
1. 개발자가 `npm test` 실행 -> Vitest가 실행됨
2. `import.meta.env.VITE_*`가 추가 설정 없이 동작
3. `vi.fn()`, `vi.mock()` 사용
4. CI(`ci.yml`)에서 `npm test`가 Vitest를 실행

**N-2:**
1. 개발자가 아이콘이 필요할 때 `import { ChevronIcon, SearchIcon } from '@presentation/components/icons'`
2. `<ChevronIcon size={16} />`, `<SearchIcon size={20} className="my-class" />` 형태로 사용
3. 아이콘 컴포넌트가 `aria-hidden="true"`, 일관된 `viewBox`, `stroke` 기본값을 자동 적용

---

## Scope (MoSCoW)

### Must have

1. **Vitest 설치 및 설정**: `vitest` + `@vitest/ui`(선택) 설치, `vitest.config.ts` 생성
2. **Jest 설정 제거**: `jest.config.js`, `@types/jest`, `ts-jest`, `ts-jest-mock-import-meta`, `jest-environment-jsdom`, `identity-obj-proxy` 제거
3. **Mock 파일 마이그레이션**: 전체 `__mocks__/` 파일에서 `jest.fn()` -> `vi.fn()` 교체
4. **테스트 파일 마이그레이션**: 전체 17개 테스트 파일에서 Jest 글로벌 -> Vitest import 교체
5. **setupTests.ts 간소화**: `import.meta.env` 해킹 제거, `@testing-library/jest-dom/vitest` 사용
6. **CI 업데이트**: `ci.yml`에서 `npm test` 명령이 Vitest를 실행하도록 변경
7. **158개 기존 테스트 전체 통과**
8. **Icon 컴포넌트 생성**: 공유 `Icon` 컴포넌트 + 최소 3개 아이콘 (Chevron, Check, MapPin)
9. **ChevronIcon 중복 제거**: `WeatherHeroSection.tsx`, `StatsSection.tsx`의 로컬 `ChevronIcon`을 공유 컴포넌트로 교체

### Should have

10. **추가 아이콘 추출**: `BottomNavigation.tsx`의 4개 아이콘(Home, Route, Bell, Settings)을 아이콘 시스템으로 이동
11. **아이콘 컴포넌트 테스트**: Icon 컴포넌트의 렌더링/접근성 테스트 (Vitest로 작성)
12. **package.json scripts 업데이트**: `test:watch` -> `vitest`, `test:cov` -> `vitest run --coverage`

### Could have

13. **SearchIcon, PlusIcon, CloseIcon, WarningIcon 추출**: 추가 공용 아이콘 4개
14. **아이콘 스토리북/카탈로그 페이지**: 개발용 아이콘 미리보기 (Won't로 이동 가능)

### Won't have (this cycle)

- 전체 136개 인라인 SVG 교체 (점진적 마이그레이션, 새 코드부터 적용)
- 외부 아이콘 라이브러리 도입 (lucide-react 등 - 번들 사이즈 증가)
- Backend Jest 마이그레이션 (Backend은 NestJS, Jest가 표준)
- Vitest UI 대시보드 설정 (선택적 개발 편의)

---

## Acceptance Criteria

### Part A: Jest to Vitest Migration

#### AC-1: Vitest 설정 및 테스트 실행

- [ ] Given `frontend/` 디렉토리에서 `npm test`를 실행하면, When Vitest가 테스트 러너로 동작하고, Then 기존 158개 테스트가 모두 통과한다.
- [ ] Given `vitest.config.ts`가 존재하고, When Vite의 `resolve.alias` 설정을 공유하면, Then `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*` path alias가 별도 매핑 없이 동작한다.
- [ ] Given 테스트 파일에서 `import.meta.env.VITE_API_BASE_URL`을 참조하면, When Vitest가 실행되면, Then 추가 AST 트랜스포머 없이 값이 올바르게 주입된다.

#### AC-2: Jest 의존성 완전 제거

- [ ] Given `frontend/package.json`의 `devDependencies`에서, Then 다음 패키지가 모두 제거된다: `jest`, `jest-environment-jsdom`, `ts-jest`, `ts-jest-mock-import-meta`, `@types/jest`, `identity-obj-proxy`.
- [ ] Given `frontend/jest.config.js` 파일이, Then 삭제된다.
- [ ] Given `frontend/src/setupTests.ts`에서, Then `Object.defineProperty(globalThis, 'import', ...)` 해킹 코드가 제거된다.

#### AC-3: Mock 파일 마이그레이션

- [ ] Given `frontend/src/__mocks__/` 하위 모든 mock 파일에서, When `jest.fn()`이 사용되던 곳이, Then `vi.fn()`으로 교체된다.
- [ ] Given mock 파일이 `vi`를 사용하면, When 파일 상단에 `import { vi } from 'vitest'`가 있거나 globals 설정으로 `vi`가 전역 사용 가능하다.

#### AC-4: CI 파이프라인 호환

- [ ] Given `.github/workflows/ci.yml`의 frontend job에서, When `npm test -- --passWithNoTests`가 실행되면, Then Vitest가 실행되고 모든 테스트가 통과한다.
- [ ] Given CI에서, When lint + typecheck + test + build가 순서대로 실행되면, Then 모든 단계가 통과한다.

### Part B: SVG Icon System

#### AC-5: Icon 컴포넌트 API

- [ ] Given `@presentation/components/icons`에서 `ChevronIcon`을 import하면, When `<ChevronIcon size={16} />` 형태로 렌더링하면, Then 16x16 크기의 SVG 아이콘이 `aria-hidden="true"` 속성과 함께 렌더링된다.
- [ ] Given Icon 컴포넌트에 `className` prop을 전달하면, Then 해당 클래스가 SVG 루트 요소에 적용된다.
- [ ] Given Icon 컴포넌트에 `size` prop을 전달하지 않으면, Then 기본 크기(24px)로 렌더링된다.

#### AC-6: ChevronIcon 중복 제거

- [ ] Given `WeatherHeroSection.tsx` 파일에서, Then 로컬 `ChevronIcon` 함수 정의가 제거되고 공유 컴포넌트를 import한다.
- [ ] Given `StatsSection.tsx` 파일에서, Then 로컬 `ChevronIcon` 함수 정의가 제거되고 공유 컴포넌트를 import한다.
- [ ] Given 기존 접기/펼치기 기능(Cycle 7)이, When ChevronIcon이 교체된 후에도, Then 동일하게 동작한다 (`collapsible-chevron` 클래스 + rotation 포함).

#### AC-7: 빌드 및 린트

- [ ] `npm run lint` -- 에러 0개
- [ ] `npm run type-check` -- 에러 0개
- [ ] `npm run build` -- 성공
- [ ] `npm test` -- 전체 통과 (158개 + 신규 Icon 테스트)

---

## Task Breakdown

### Phase 1: Jest to Vitest Migration

#### Task 1: Vitest 패키지 설치 -- S -- Deps: none

**변경:** `frontend/package.json`

```bash
# 설치
npm install -D vitest @vitest/coverage-v8 jsdom

# 제거
npm uninstall jest jest-environment-jsdom ts-jest ts-jest-mock-import-meta @types/jest identity-obj-proxy
```

**주의:** `@testing-library/jest-dom`은 유지 (Vitest와 호환됨).

#### Task 2: vitest.config.ts 생성 -- S -- Deps: Task 1

**파일:** `frontend/vitest.config.ts` (신규)

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      include: ['**/?(*.)+(spec|test).(ts|tsx)'],
      exclude: ['node_modules', 'e2e'],
      css: true,
    },
  }),
);
```

핵심: `mergeConfig`로 Vite의 `resolve.alias`를 자동 상속. `import.meta.env`는 Vitest가 네이티브 지원.

**주의사항:**
- `vite.config.ts`의 `defineConfig(({ mode }) => ...)` 패턴은 함수형이므로 `viteConfig({ mode: 'test', command: 'serve' })`로 호출해야 한다.
- `css: true`로 CSS import가 에러 없이 처리됨 (`identity-obj-proxy` 대체).
- `globals: true`로 `describe`, `it`, `expect`, `vi`가 import 없이 사용 가능.

#### Task 3: jest.config.js 삭제 -- S -- Deps: Task 2

**삭제 파일:** `frontend/jest.config.js`

이 파일의 모든 설정이 `vitest.config.ts`로 대체되었는지 확인:

| jest.config.js 항목 | vitest.config.ts 대체 |
|---------------------|----------------------|
| `testEnvironment: 'jsdom'` | `test.environment: 'jsdom'` |
| `preset: 'ts-jest'` | 불필요 (Vite가 TS 처리) |
| `moduleNameMapper` (path aliases) | Vite `resolve.alias` 자동 상속 |
| `moduleNameMapper` (CSS) | `test.css: true` |
| `moduleNameMapper` (`@infrastructure/api`) | `test.alias` 또는 `vi.mock()` |
| `transformIgnorePatterns` (uuid) | 불필요 (Vite가 ESM 처리) |
| `globals.ts-jest.astTransformers` | 불필요 (`import.meta.env` 네이티브) |
| `setupFilesAfterEnv` | `test.setupFiles` |

**Mock path alias 처리:** `@infrastructure/api`의 mock 매핑은 `vitest.config.ts`에서 `test.alias`로 설정:

```typescript
test: {
  alias: {
    '@infrastructure/api': './src/__mocks__/infrastructure/api/index.ts',
    '@infrastructure/analytics/behavior-collector': './src/__mocks__/infrastructure/analytics/behavior-collector.ts',
  },
}
```

#### Task 4: setupTests.ts 간소화 -- S -- Deps: Task 2

**파일:** `frontend/src/setupTests.ts`

변경 전:
```typescript
import '@testing-library/jest-dom';
Object.defineProperty(globalThis, 'import', {
  value: { meta: { env: { VITE_API_BASE_URL: '...', VITE_VAPID_PUBLIC_KEY: '...' } } },
});
```

변경 후:
```typescript
import '@testing-library/jest-dom/vitest';
```

- `Object.defineProperty` 해킹 전체 삭제.
- `import.meta.env`는 Vitest의 `define` 또는 `.env.test` 파일로 자연스럽게 처리.
- 테스트 전용 환경변수는 `frontend/.env.test` 파일로 분리:

**파일:** `frontend/.env.test` (신규)
```
VITE_API_BASE_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=test-vapid-key
```

#### Task 5: Mock 파일 마이그레이션 (jest.fn -> vi.fn) -- M -- Deps: Task 2

**대상 파일 (5개):**

| 파일 | 변경 내용 |
|------|----------|
| `src/__mocks__/infrastructure/api/index.ts` | `jest.fn()` -> `vi.fn()` (18곳) |
| `src/__mocks__/infrastructure/api/api-client.ts` | `jest.fn()` -> `vi.fn()` (5곳) |
| `src/__mocks__/infrastructure/analytics/behavior-collector.ts` | `jest.fn()` -> `vi.fn()` (3곳) |
| `src/__mocks__/uuid.ts` | 변경 불필요 (jest.fn 미사용) |
| `src/__mocks__/import-meta.ts` | 삭제 (불필요 -- Vitest 네이티브 지원) |

`globals: true` 설정으로 `vi`는 import 없이 전역 사용 가능. 하지만 명시성을 위해 mock 파일 상단에 `import { vi } from 'vitest'`를 추가하는 것도 가능. **결정: `globals: true`를 사용하되, `tsconfig.json`에 vitest 타입을 추가하여 타입 안전성 보장.**

`tsconfig.json` 변경:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

#### Task 6: 테스트 파일 마이그레이션 -- M -- Deps: Task 5

**대상 파일 (17개):**

```
src/presentation/pages/OnboardingPage.test.tsx
src/presentation/pages/NotFoundPage.test.tsx
src/presentation/pages/CommuteTrackingPage.test.tsx
src/presentation/pages/RouteSetupPage.test.tsx
src/presentation/pages/LoginPage.test.tsx
src/presentation/pages/AlertSettingsPage.test.tsx
src/presentation/pages/CommuteDashboardPage.test.tsx
src/presentation/pages/home/HomePage.test.tsx
src/presentation/pages/NotificationHistoryPage.test.tsx
src/presentation/pages/home/route-utils.test.ts
src/presentation/pages/home/alert-schedule-utils.test.ts
src/presentation/pages/home/weather-utils.test.ts
src/presentation/pages/SettingsPage.test.tsx
src/presentation/hooks/useUserLocation.test.ts
src/presentation/pages/alert-settings/cron-utils.test.ts
src/presentation/hooks/useFocusTrap.test.ts
src/presentation/hooks/useCollapsible.test.ts
```

**변경 패턴:**

1. `jest.fn()` -> `vi.fn()` (globals: true이므로 import 불필요)
2. `jest.mock()` -> `vi.mock()`
3. `jest.spyOn()` -> `vi.spyOn()`
4. `jest.useFakeTimers()` -> `vi.useFakeTimers()`
5. `jest.advanceTimersByTime()` -> `vi.advanceTimersByTime()`
6. `jest.clearAllMocks()` -> `vi.clearAllMocks()`
7. `jest.resetAllMocks()` -> `vi.resetAllMocks()`

**주의:** 대부분의 API는 1:1 매핑이다. `globals: true` 설정으로 `describe`, `it`, `expect`, `beforeEach`, `afterEach` 등은 변경 불필요.

#### Task 7: package.json scripts 업데이트 -- S -- Deps: Task 6

**파일:** `frontend/package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage"
  }
}
```

**CI 호환:** `npm test -- --passWithNoTests`는 Vitest에서 `npm test -- --passWithNoTests` 옵션이 존재하지 않지만, Vitest는 테스트 파일이 없어도 기본적으로 에러를 발생시키지 않으므로 `ci.yml`에서 `--passWithNoTests` 플래그를 제거하면 된다.

#### Task 8: CI 워크플로우 업데이트 -- S -- Deps: Task 7

**파일:** `.github/workflows/ci.yml`

```yaml
# 변경 전
- run: npm test -- --passWithNoTests

# 변경 후
- run: npm test
```

#### Task 9: 전체 테스트 실행 및 검증 -- S -- Deps: Task 8

```bash
cd frontend
npm run lint:check    # ESLint 통과
npm run type-check    # TypeScript 통과
npm test              # Vitest로 158개 테스트 통과
npm run build         # 빌드 성공
```

---

### Phase 2: SVG Icon System

#### Task 10: Icon 시스템 디렉토리 및 기본 타입 생성 -- S -- Deps: none

**파일:** `frontend/src/presentation/components/icons/types.ts` (신규)

```typescript
export interface IconProps {
  /** Icon size in pixels. Default: 24 */
  size?: number;
  /** Additional CSS class name */
  className?: string;
  /** Custom stroke color. Default: 'currentColor' */
  color?: string;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** Override aria-hidden. Default: true (decorative icon) */
  ariaHidden?: boolean;
  /** Accessible label for non-decorative icons */
  ariaLabel?: string;
}
```

설계 원칙:
- `size`로 `width`/`height`를 동시 제어 (정사각형 아이콘 전제)
- `color` 기본값 `currentColor`로 부모 요소의 `color` 상속
- `ariaHidden` 기본값 `true` -- 대부분의 아이콘은 장식용. 텍스트 없는 버튼의 아이콘은 `ariaLabel` 사용.

#### Task 11: 핵심 아이콘 컴포넌트 구현 -- M -- Deps: Task 10

**파일:** `frontend/src/presentation/components/icons/` 디렉토리

구현할 아이콘 (기존 코드에서 3회 이상 사용되는 것 우선):

| 아이콘 | 파일명 | 현재 중복 사용 횟수 | 출처 |
|--------|--------|:------------------:|------|
| Chevron (down) | `ChevronIcon.tsx` | 4+ | WeatherHero, Stats, 여러 리스트 |
| Check | `CheckIcon.tsx` | 5+ | 체크리스트, 확인 단계 |
| MapPin | `MapPinIcon.tsx` | 3+ | 위치 관련 UI |
| Search | `SearchIcon.tsx` | 4+ | 검색 입력 |
| Plus | `PlusIcon.tsx` | 3+ | 추가 버튼 |
| Close (X) | `CloseIcon.tsx` | 3+ | 모달, 배너 닫기 |
| Warning | `WarningIcon.tsx` | 3+ | 에러/경고 상태 |

**ChevronIcon 구현 예시:**

```typescript
import type { IconProps } from './types';

interface ChevronIconProps extends IconProps {
  /** Direction of the chevron. Default: 'down' */
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function ChevronIcon({
  size = 24,
  className,
  color = 'currentColor',
  strokeWidth = 2,
  ariaHidden = true,
  ariaLabel,
  direction = 'down',
}: ChevronIconProps): JSX.Element {
  const rotationMap = { down: 0, up: 180, left: 90, right: -90 };
  const rotation = rotationMap[direction];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
```

**중요:** 기존 `WeatherHeroSection`과 `StatsSection`의 `ChevronIcon`은 `collapsible-chevron` CSS 클래스와 `collapsible-chevron--expanded` 수정자를 사용한다. 공유 컴포넌트에서는 `className` prop으로 이 클래스를 전달받는 방식으로 호환성을 유지한다. `direction` prop은 이 사용 사례에서는 사용하지 않고, 기존 CSS rotation 패턴을 유지한다.

#### Task 12: Barrel export (index.ts) 생성 -- S -- Deps: Task 11

**파일:** `frontend/src/presentation/components/icons/index.ts` (신규)

```typescript
export { ChevronIcon } from './ChevronIcon';
export { CheckIcon } from './CheckIcon';
export { MapPinIcon } from './MapPinIcon';
export { SearchIcon } from './SearchIcon';
export { PlusIcon } from './PlusIcon';
export { CloseIcon } from './CloseIcon';
export { WarningIcon } from './WarningIcon';
export type { IconProps } from './types';
```

#### Task 13: ChevronIcon 중복 제거 (WeatherHeroSection + StatsSection) -- S -- Deps: Task 11

**파일:**
- `frontend/src/presentation/pages/home/WeatherHeroSection.tsx` -- 로컬 `ChevronIcon` 삭제, import 추가
- `frontend/src/presentation/pages/home/StatsSection.tsx` -- 로컬 `ChevronIcon` 삭제, import 추가

변경 패턴:
```typescript
// 변경 전 (각 파일에 로컬 정의)
function ChevronIcon({ expanded }: { expanded: boolean }): JSX.Element {
  return (
    <svg className={`collapsible-chevron ${expanded ? 'collapsible-chevron--expanded' : ''}`}
      width="16" height="16" viewBox="0 0 24 24" ... >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// 변경 후
import { ChevronIcon } from '@presentation/components/icons';

// 사용 부분
<ChevronIcon
  size={16}
  className={`collapsible-chevron ${isExpanded ? 'collapsible-chevron--expanded' : ''}`}
/>
```

#### Task 14: Icon 컴포넌트 테스트 -- S -- Deps: Task 11, Task 9 (Vitest 완료 후)

**파일:** `frontend/src/presentation/components/icons/icons.test.tsx` (신규)

테스트 케이스 (Vitest로 작성):
- `ChevronIcon`이 올바른 크기로 렌더링되는지
- `className` prop이 SVG에 적용되는지
- `ariaHidden` 기본값이 `true`인지
- `ariaLabel` 전달 시 `aria-hidden`이 아닌 `aria-label`이 설정되는지
- `size` 미전달 시 기본 24px인지
- 각 아이콘(Check, MapPin, Search, Plus, Close, Warning)이 렌더링되는지

#### Task 15: 빌드 검증 및 최종 체크 -- S -- Deps: Task 13, Task 14

```bash
cd frontend
npm run lint:check    # 0 errors
npm run type-check    # 0 errors
npm test              # 모든 테스트 통과 (158 기존 + ~10 신규 Icon 테스트)
npm run build         # 성공
```

---

## File Impact Summary

### Phase 1 -- Vitest Migration

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `frontend/vitest.config.ts` | **신규** | Vitest 설정 (vite.config 상속) |
| `frontend/.env.test` | **신규** | 테스트 전용 환경변수 |
| `frontend/jest.config.js` | **삭제** | Jest 설정 제거 |
| `frontend/src/__mocks__/import-meta.ts` | **삭제** | 불필요 (Vitest 네이티브) |
| `frontend/package.json` | 수정 | 의존성 교체, scripts 업데이트 |
| `frontend/src/setupTests.ts` | 수정 | import.meta 해킹 제거 |
| `frontend/src/__mocks__/infrastructure/api/index.ts` | 수정 | jest.fn -> vi.fn |
| `frontend/src/__mocks__/infrastructure/api/api-client.ts` | 수정 | jest.fn -> vi.fn |
| `frontend/src/__mocks__/infrastructure/analytics/behavior-collector.ts` | 수정 | jest.fn -> vi.fn |
| `frontend/src/presentation/pages/*.test.tsx` (10개) | 수정 | jest -> vi 교체 |
| `frontend/src/presentation/pages/home/*.test.ts` (3개) | 수정 | jest -> vi 교체 |
| `frontend/src/presentation/hooks/*.test.ts` (3개) | 수정 | jest -> vi 교체 |
| `frontend/src/presentation/pages/alert-settings/*.test.ts` (1개) | 수정 | jest -> vi 교체 |
| `frontend/tsconfig.json` | 수정 | vitest/globals 타입 추가 |
| `.github/workflows/ci.yml` | 수정 | --passWithNoTests 제거 |

### Phase 2 -- Icon System

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `frontend/src/presentation/components/icons/types.ts` | **신규** | IconProps 타입 |
| `frontend/src/presentation/components/icons/ChevronIcon.tsx` | **신규** | Chevron 아이콘 |
| `frontend/src/presentation/components/icons/CheckIcon.tsx` | **신규** | Check 아이콘 |
| `frontend/src/presentation/components/icons/MapPinIcon.tsx` | **신규** | MapPin 아이콘 |
| `frontend/src/presentation/components/icons/SearchIcon.tsx` | **신규** | Search 아이콘 |
| `frontend/src/presentation/components/icons/PlusIcon.tsx` | **신규** | Plus 아이콘 |
| `frontend/src/presentation/components/icons/CloseIcon.tsx` | **신규** | Close 아이콘 |
| `frontend/src/presentation/components/icons/WarningIcon.tsx` | **신규** | Warning 아이콘 |
| `frontend/src/presentation/components/icons/index.ts` | **신규** | Barrel export |
| `frontend/src/presentation/components/icons/icons.test.tsx` | **신규** | 아이콘 테스트 |
| `frontend/src/presentation/pages/home/WeatherHeroSection.tsx` | 수정 | 로컬 ChevronIcon 제거 |
| `frontend/src/presentation/pages/home/StatsSection.tsx` | 수정 | 로컬 ChevronIcon 제거 |

**예상 변경량:** 신규 12파일 (~350줄) + 수정 ~22파일 (~200줄 변경) + 삭제 2파일

---

## Technical Notes

### Vitest와 jest.config.js의 moduleNameMapper 호환

현재 `jest.config.js`의 가장 중요한 매핑:

```javascript
// Mock redirect: 특정 모듈을 mock 파일로 강제 리다이렉트
'^@infrastructure/api$': '<rootDir>/src/__mocks__/infrastructure/api/index.ts',
'^@infrastructure/api/(.*)$': '<rootDir>/src/__mocks__/infrastructure/api/index.ts',
'^@infrastructure/analytics/(.*)$': '<rootDir>/src/__mocks__/infrastructure/analytics/$1',
```

Vitest에서는 `test.alias`로 동일하게 처리:

```typescript
test: {
  alias: [
    { find: /^@infrastructure\/api$/, replacement: './src/__mocks__/infrastructure/api/index.ts' },
    { find: /^@infrastructure\/api\/(.*)$/, replacement: './src/__mocks__/infrastructure/api/index.ts' },
    { find: /^@infrastructure\/analytics\/(.*)$/, replacement: './src/__mocks__/infrastructure/analytics/$1' },
  ],
}
```

`test.alias`가 `resolve.alias`보다 우선 적용되므로, `@infrastructure/api`는 테스트에서만 mock으로 리다이렉트되고 프로덕션 빌드에서는 실제 모듈을 사용한다.

### uuid mock 처리

현재 `jest.config.js`에서 `'^uuid$': '<rootDir>/src/__mocks__/uuid.ts'`로 매핑하고 있다. Vitest에서는 두 가지 옵션:

1. **`test.alias`에 추가** (권장): `{ find: /^uuid$/, replacement: './src/__mocks__/uuid.ts' }`
2. **`vi.mock('uuid', ...)`를 각 테스트에서 사용**: 더 명시적이지만 반복적

**결정:** `test.alias`에 추가하여 기존 동작 유지.

### CSS 모듈 처리

현재 Jest에서 `identity-obj-proxy`로 CSS import를 처리한다. Vitest에서는 `css: true` 설정으로 CSS 파일을 실제로 파싱한다 (JSDOM 한계로 스타일이 적용되지는 않지만 import 에러는 발생하지 않음). 또는 `css: false`로 CSS import를 무시할 수도 있다.

**결정:** `css: true`로 설정. CSS import 에러를 방지하면서 추가 의존성이 불필요.

### Icon 컴포넌트 설계 패턴

각 아이콘을 별도 파일로 분리하는 이유:
1. **Tree-shaking:** 사용하지 않는 아이콘은 번들에 포함되지 않음
2. **코드 스플리팅 친화적:** 각 아이콘을 독립적으로 lazy load 가능 (필요시)
3. **검색 용이:** 파일명으로 아이콘을 바로 찾을 수 있음
4. **PR 리뷰:** 아이콘 변경 시 해당 파일만 diff에 표시

하나의 거대한 `Icons.tsx`에 모든 아이콘을 넣지 않는다.

---

## Risk & Mitigation

| 리스크 | 확률 | 영향 | 대응 |
|--------|:----:|:----:|------|
| Vitest의 `import.meta.env` 처리가 예상과 다름 | 낮음 | 높음 | `.env.test` 파일 + `define` 설정으로 이중 안전장치 |
| `test.alias`가 Jest의 `moduleNameMapper`와 동일하게 동작하지 않음 | 중간 | 높음 | 마이그레이션 후 즉시 158개 테스트 실행으로 검증. 실패 시 `vi.mock()`으로 개별 처리 |
| CSS import 처리 차이로 테스트 실패 | 낮음 | 중간 | `css: false`로 fallback 가능 |
| `@testing-library/jest-dom`이 Vitest에서 동작하지 않음 | 매우 낮음 | 높음 | `@testing-library/jest-dom/vitest` 전용 entrypoint 사용 (v6.0+ 지원) |

---

## Open Questions

1. **`vitest/globals` 사용 여부:** `globals: true`로 `describe`/`it`/`expect`/`vi`를 전역으로 사용할지, 각 파일에서 `import { describe, it, expect, vi } from 'vitest'`로 명시할지.
   - **결정: `globals: true` 사용.** 기존 17개 테스트 파일의 변경량을 최소화하고, `jest.fn()` -> `vi.fn()`만 교체하면 된다. `tsconfig.json`에 `"types": ["vitest/globals"]` 추가로 타입 안전성 확보.

2. **Icon 시스템의 점진적 도입 범위:** 이번 사이클에서 ChevronIcon 중복만 해결할지, 아니면 BottomNavigation의 4개 아이콘도 이동할지.
   - **결정: Must-have는 ChevronIcon 중복 제거만.** BottomNavigation 아이콘은 Should-have로 시간이 남으면 진행.

---

## Out of Scope

- **Backend Jest 마이그레이션:** NestJS는 Jest가 표준. 마이그레이션 불필요.
- **전체 인라인 SVG 교체:** 49개 파일 136개 SVG를 이번 사이클에서 모두 교체하지 않는다. 새 코드/수정 시 점진적으로 교체.
- **외부 아이콘 라이브러리:** lucide-react, heroicons 등 외부 패키지 도입은 하지 않는다. 프로젝트의 아이콘은 ~20개 미만이므로 직접 관리가 효율적.
- **Vitest UI:** `@vitest/ui` 패키지는 설치하지 않는다. CLI 기반 테스트만 사용.
- **Coverage threshold 설정:** 이번 사이클에서는 설정하지 않는다. 향후 별도 사이클에서 검토.

---

## Definition of Done

1. `frontend/jest.config.js` 삭제됨
2. `frontend/vitest.config.ts` 존재하고 Vite 설정을 상속함
3. Jest 관련 devDependencies 6개 모두 제거됨 (`jest`, `jest-environment-jsdom`, `ts-jest`, `ts-jest-mock-import-meta`, `@types/jest`, `identity-obj-proxy`)
4. `npm test`가 Vitest를 실행하고 158개 이상 테스트가 통과함
5. `setupTests.ts`에 `import.meta.env` 해킹 코드가 없음
6. `@presentation/components/icons/` 디렉토리에 최소 7개 아이콘 컴포넌트 존재
7. `WeatherHeroSection.tsx`와 `StatsSection.tsx`의 로컬 `ChevronIcon` 정의가 제거되고 공유 컴포넌트를 사용
8. 기존 접기/펼치기 기능이 동일하게 동작
9. Icon 컴포넌트 테스트가 존재하고 통과
10. `lint` + `typecheck` + `build` + `test` 전체 통과
11. PR 생성 + 머지 + Vercel 배포 완료 + 배포 사이트 검증

---

*Spec: PM Agent (Cycle 8) | 다음: Dev 구현 -> QA 검증 -> PD UX 리뷰*
