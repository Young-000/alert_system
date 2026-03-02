# Project Context — Alert System

Generated: 2026-03-03
Branch: `feature/e2e-auto-review-20260303`

---

## Project Info

| 항목 | 값 |
|------|-----|
| **프로젝트명** | Alert System |
| **설명** | 출근/퇴근 시 날씨, 미세먼지, 버스/지하철 도착시간 통합 알림 시스템 |
| **구조** | Monorepo (frontend + backend) |
| **Git 브랜치** | `feature/e2e-auto-review-20260303` (base: `main`) |

---

## Tech Stack

### Frontend
| 항목 | 값 |
|------|-----|
| Framework | React 18 + TypeScript 5.9 |
| Bundler | Vite 5 |
| Styling | Tailwind CSS 3 |
| State | @tanstack/react-query 5 |
| Router | react-router-dom 6 |
| PWA | vite-plugin-pwa (Workbox) |
| DnD | @dnd-kit/core + sortable |
| Testing (Unit) | Vitest 4 + Testing Library |
| Testing (E2E) | Playwright 1.57 |
| Linter | ESLint 8 + TypeScript ESLint |

### Backend
| 항목 | 값 |
|------|-----|
| Framework | NestJS 10 + TypeScript 5.3 |
| ORM | TypeORM 0.3 |
| DB Driver | pg (PostgreSQL) |
| Auth | Passport (JWT, Google OAuth) |
| Scheduling | @nestjs/schedule + AWS EventBridge |
| Queue | BullMQ |
| Notification | web-push, Solapi (KakaoTalk) |
| AWS SDK | @aws-sdk/client-scheduler |
| Security | Helmet, @nestjs/throttler |
| API Docs | Swagger |
| Testing | Jest 29 + Supertest |
| Linter | ESLint 8 + TypeScript ESLint |

---

## Available Scripts

### Frontend (`frontend/package.json`)
| Script | Command | 용도 |
|--------|---------|------|
| `dev` | `vite` | 로컬 개발 서버 |
| `build` | `tsc && vite build` | 프로덕션 빌드 |
| `lint` | `eslint "src/**/*.{ts,tsx}" --fix` | 린트 + 자동 수정 |
| `lint:check` | `eslint "src/**/*.{ts,tsx}"` | 린트 검사 (read-only) |
| `type-check` | `tsc --noEmit` | 타입 체크 |
| `test` | `vitest run` | 유닛 테스트 |
| `test:cov` | `vitest run --coverage` | 커버리지 포함 테스트 |
| `e2e` | `playwright test` | E2E 테스트 |

### Backend (`backend/package.json`)
| Script | Command | 용도 |
|--------|---------|------|
| `build` | `nest build` | 프로덕션 빌드 |
| `start:dev` | `nest start --watch` | 로컬 개발 서버 |
| `start:prod` | `node dist/src/main` | 프로덕션 시작 |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` | 린트 + 자동 수정 |
| `lint:check` | `eslint "{src,apps,libs,test}/**/*.ts"` | 린트 검사 (read-only) |
| `type-check` | `tsc --noEmit` | 타입 체크 |
| `test` | `jest` | 유닛 테스트 |
| `test:cov` | `jest --coverage` | 커버리지 포함 테스트 |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | E2E 테스트 |

---

## Deployment URLs

| 환경 | URL | 플랫폼 |
|------|-----|--------|
| **Frontend (Production)** | https://frontend-xi-two-52.vercel.app | Vercel |
| **Backend API (HTTPS)** | https://d1qgl3ij2xig8k.cloudfront.net | AWS CloudFront -> ECS Fargate |

---

## Database

| 항목 | 값 |
|------|-----|
| **종류** | PostgreSQL (Supabase) |
| **Project ID** | `gtnqsbdlybrkbsgtecvy` |
| **Schema** | `alert_system` |
| **ORM** | TypeORM (backend) |
| **Client** | @supabase/supabase-js (frontend) |
| **Dev fallback** | SQLite (USE_SQLITE=true) |

### 주요 테이블/엔티티 (~35개)
- `users`, `alerts`, `subway_stations`, `push_subscriptions`
- `commute_routes`, `commute_sessions`, `route_checkpoints`, `checkpoint_records`
- `user_badges`, `user_challenges`, `challenge_templates`
- `missions`, `daily_mission_records`, `mission_scores`
- `air_quality_cache`, `weather_cache`, `bus_arrival_cache`, `subway_arrival_cache`
- `community_tips`, `community_tip_reports`, `privacy_settings`
- `segment_congestion`, `regional_insights`, `route_analytics`
- `alternative_mappings`, `recommendations`
- `notification_rules`, `notification_contexts`, `rule_conditions`
- `behavior_events`, `commute_events`, `commute_records`, `commute_streaks`
- `smart_departure_settings`, `smart_departure_snapshots`
- `live_activity_tokens`, `user_patterns`, `user_places`
- `api_call_log`

---

## Active Review Categories

| # | 카테고리 | 활성화 | 근거 |
|---|----------|:------:|------|
| 1 | **Build** | YES | tsc + vite build (FE), tsc + nest build (BE) |
| 2 | **Lint** | YES | ESLint + TypeScript ESLint (FE + BE) |
| 3 | **Test** | YES | Vitest (FE) + Jest (BE) 설정 존재 |
| 4 | **Security** | YES | JWT auth, Helmet, Throttler, SSM Parameters |
| 5 | **Code Quality** | YES | Frontend + Backend 소스코드 존재 |
| 6 | **Performance** | YES | PWA, React Query, Tailwind, lazy loading |
| 7 | **Accessibility** | YES | React frontend with user-facing UI |
| 8 | **UI/UX** | YES | 배포 URL 존재 (Vercel) |
| 9 | **User Flow** | YES | 17+ pages, 핵심 사용자 플로우 다수 |
| 10 | **Database** | YES | Supabase PostgreSQL (alert_system 스키마, ~35 엔티티) |

**활성 카테고리: 10/10**

---

## Previous Review Status

| Round | 날짜 | 수정 | 핵심 |
|-------|------|------|------|
| Round 1 | 2026-02-13 | 71건 | 최초 점검 (quality 39, a11y 16, perf 6 등) |
| Round 2 | 2026-02-13 | 0건 | 재검증 (회귀 없음 확인) |
| Round 3 | 2026-02-13 | 25건 | PWA 캐시 수정 + 추가 점검 |
| Round 4 | 2026-02-13 | 7건 | 코드 품질 + 최종 검증 |
| Round 5 | 2026-02-28 | 31건 | Phase 2-3 완료 후 종합 점검 (1,373 tests, 10/10) |
| **총계** | | **134건** | |

### Latest Auto-Review (2026-03-02 08:00)
- FE: typecheck 0 errors, build ~168KB gzip, 594 tests passed
- BE: typecheck 0 errors, build success, 1,348 tests passed (10 skipped)
- 수정 3건: rate limiting, query invalidation, retry button
- 미해결 7건 (모두 권고사항, 수정 불필요)

---

## Test Status (latest known)

| 영역 | 결과 |
|------|------|
| Frontend | 594 tests passed (46 suites) |
| Backend | 1,348 tests passed (101 suites, 10 skipped) |
| **Total** | **1,942 tests** |
