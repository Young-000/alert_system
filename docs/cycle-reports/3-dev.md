# Cycle 3 Developer Report: Code Structure Refactoring

> 일자: 2026-02-17
> 역할: Developer
> 스펙: docs/specs/cycle-3-code-structure.md

---

## 실행 결과

### 완료된 작업 (5/5)

| ID | 항목 | 상태 | 변경 파일 수 |
|----|------|:----:|:-----------:|
| I-4 | useAuth 훅 전면 적용 | DONE | 5 |
| I-12 | ARIA tab/tabpanel 속성 | DONE | 3 |
| I-10 | PageHeader 공유 컴포넌트 | DONE | 8 (1 rewrite + 4 page + 1 CSS + 2 removed classes) |
| I-9 | AuthRequired 공유 컴포넌트 | DONE | 7 (1 new + 4 page + 1 CSS + 1 test) |
| I-1 | HomePage God Component 분할 | DONE | 16 (12 new + 2 replaced + 1 import + 1 test moved) |

### I-1: HomePage 분할 결과

**Before**: 1 file, 810 lines (HomePage.tsx)
**After**: 12 files in `home/` directory

| 파일 | 라인 | 역할 |
|------|-----:|------|
| `HomePage.tsx` | 89 | Orchestrator (composition only) |
| `use-home-data.ts` | 339 | Custom hook (14 state vars, 7 effects) |
| `weather-utils.tsx` | 177 | Pure functions + WeatherIcon |
| `route-utils.ts` | 31 | Route selection logic |
| `GuestLanding.tsx` | 48 | Non-auth landing |
| `WeatherHeroSection.tsx` | 65 | Weather card + checklist |
| `DeparturePrediction.tsx` | 23 | Departure prediction banner |
| `RouteRecommendation.tsx` | 29 | Route recommendation banner |
| `CommuteSection.tsx` | 107 | Route + transit + start |
| `AlertSection.tsx` | 38 | Alert bar / CTA |
| `StatsSection.tsx` | 70 | Weekly stats + other routes |
| `index.ts` | 1 | Barrel export |

### I-10: PageHeader 공유 컴포넌트

- Rewrote `PageHeader.tsx` (was dead code, unused import)
- New API: `title`, `action?`, `sticky?` (default true)
- Replaced 3 different CSS header classes with 1 shared `.page-header`
- Removed: `.settings-page-v2-header`, `.route-page-v2-header`, `.alert-page-v2-header`

### I-9: AuthRequired 공유 컴포넌트

- Created `AuthRequired.tsx` with `pageTitle`, `icon`, `description` props
- Applied to 4 pages: AlertSettingsPage, SettingsPage, RouteSetupPage, CommuteDashboardPage
- Unified "로그인이 필요해요" pattern across all non-auth states
- Fixed CommuteDashboardPage which previously had no login CTA (UX bug)

### CSS 정리

| 삭제된 클래스 | 대체 |
|--------------|------|
| `.settings-page-v2-header` | `.page-header` |
| `.route-page-v2-header` | `.page-header` |
| `.alert-page-v2-header` | `.page-header` |

추가된 클래스:
- `.page-header`, `.page-header-sticky`, `.page-header h1`, `.page-header-action`
- `.auth-required`, `.auth-required h2`, `.auth-required p`, `.auth-required-icon`

### 검증 결과

| 검증 항목 | 결과 |
|-----------|:----:|
| `npx jest --passWithNoTests` | PASS (10 suites, 45 tests) |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npx eslint src/ --max-warnings=0` | PASS (0 errors, 0 warnings) |
| `npx vite build` | PASS (536ms) |
| HomePage < 200 lines | PASS (89 lines) |
| No direct localStorage userId | PASS (only in test files) |

### 수정 중 발견/해결된 이슈

1. **weather-utils.ts → .tsx 리네임**: `WeatherIcon` 컴포넌트가 JSX를 포함하므로 `.tsx` 확장자 필요
2. **RouteSetupPage unused Link import**: I-9에서 AuthRequired 교체 후 `Link` import 제거 누락 → tsc에서 발견, 수정
3. **CommuteDashboardPage.test.tsx 업데이트**: AuthRequired의 새 텍스트에 맞게 테스트 assertion 수정
4. **Old HomePage.test.tsx 삭제**: 빈 테스트 파일은 Jest에서 "at least one test" 에러 발생

### 변경된 파일 전체 목록

**New files (14)**:
- `src/presentation/pages/home/index.ts`
- `src/presentation/pages/home/HomePage.tsx`
- `src/presentation/pages/home/HomePage.test.tsx`
- `src/presentation/pages/home/use-home-data.ts`
- `src/presentation/pages/home/weather-utils.tsx`
- `src/presentation/pages/home/route-utils.ts`
- `src/presentation/pages/home/GuestLanding.tsx`
- `src/presentation/pages/home/WeatherHeroSection.tsx`
- `src/presentation/pages/home/DeparturePrediction.tsx`
- `src/presentation/pages/home/RouteRecommendation.tsx`
- `src/presentation/pages/home/CommuteSection.tsx`
- `src/presentation/pages/home/AlertSection.tsx`
- `src/presentation/pages/home/StatsSection.tsx`
- `src/presentation/components/AuthRequired.tsx`

**Modified files (8)**:
- `src/presentation/components/PageHeader.tsx` (rewritten)
- `src/presentation/pages/HomePage.tsx` (replaced with re-export shim)
- `src/presentation/App.tsx` (import path change)
- `src/presentation/pages/AlertSettingsPage.tsx`
- `src/presentation/pages/SettingsPage.tsx`
- `src/presentation/pages/RouteSetupPage.tsx`
- `src/presentation/pages/CommuteDashboardPage.tsx`
- `src/presentation/pages/route-setup/RouteListView.tsx`
- `src/presentation/pages/NotificationHistoryPage.tsx`
- `src/presentation/index.css`

**Deleted files (1)**:
- `src/presentation/pages/HomePage.test.tsx` (moved to home/)

**Modified test files (1)**:
- `src/presentation/pages/CommuteDashboardPage.test.tsx` (assertion update)
