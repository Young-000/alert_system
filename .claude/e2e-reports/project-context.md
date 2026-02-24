# E2E Auto Review - Project Context

Generated: 2026-02-24

---

## Project Info

| Item | Value |
|------|-------|
| **Project Name** | Alert System |
| **Description** | 출근/퇴근 시 날씨, 미세먼지, 버스/지하철 도착시간 통합 알림 시스템 |
| **Git Branch** | `feature/e2e-auto-review-20260224` |
| **Frontend URL** | https://frontend-xi-two-52.vercel.app |
| **Backend API URL** | https://d1qgl3ij2xig8k.cloudfront.net |

---

## Tech Stack

### Frontend (`alert-system-frontend`)
| Category | Technology |
|----------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| State/Data | @tanstack/react-query 5 |
| Routing | react-router-dom 6 |
| DB Client | @supabase/supabase-js 2 |
| DnD | @dnd-kit/core + sortable |
| Testing (Unit) | Vitest 4 + Testing Library |
| Testing (E2E) | Playwright |
| PWA | vite-plugin-pwa |

### Backend (`alert-system-backend`)
| Category | Technology |
|----------|-----------|
| Framework | NestJS 10 + TypeScript |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL (Supabase) |
| Auth | Passport (JWT, Google OAuth, Local) |
| Scheduling | @nestjs/schedule + AWS EventBridge Scheduler |
| Queue | BullMQ |
| Notifications | web-push, Solapi (KakaoTalk), expo-server-sdk |
| Security | helmet, @nestjs/throttler |
| API Docs | @nestjs/swagger |
| Testing | Jest 29 + Supertest |

---

## Available Scripts

### Frontend
| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Dev server |
| `build` | `tsc && vite build` | Type-check + production build |
| `lint` | `eslint "src/**/*.{ts,tsx}" --fix` | Lint with auto-fix |
| `lint:check` | `eslint "src/**/*.{ts,tsx}"` | Lint check only |
| `type-check` | `tsc --noEmit` | TypeScript type check |
| `test` | `vitest run` | Run unit tests |
| `test:cov` | `vitest run --coverage` | Tests with coverage |
| `e2e` | `playwright test` | E2E tests |

### Backend
| Script | Command | Description |
|--------|---------|-------------|
| `build` | `nest build` | Production build |
| `start:dev` | `nest start --watch` | Dev server with watch |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` | Lint with auto-fix |
| `lint:check` | `eslint "{src,apps,libs,test}/**/*.ts"` | Lint check only |
| `type-check` | `tsc --noEmit` | TypeScript type check |
| `test` | `jest` | Run unit tests |
| `test:cov` | `jest --coverage` | Tests with coverage |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | E2E tests |

---

## Database

| Item | Value |
|------|-------|
| Provider | Supabase (PostgreSQL) |
| Project ID | `gtnqsbdlybrkbsgtecvy` |
| Schema | `alert_system` |
| Tables | `users`, `alerts`, `subway_stations`, `push_subscriptions` |
| ORM | TypeORM (backend) |
| Client | @supabase/supabase-js (frontend) |

---

## Infrastructure

| Component | Service |
|-----------|---------|
| Frontend Hosting | Vercel |
| Backend Hosting | AWS ECS Fargate |
| CDN/HTTPS | AWS CloudFront |
| Load Balancer | AWS ALB |
| Container Registry | AWS ECR |
| Secrets Management | AWS SSM Parameter Store |
| Scheduling | AWS EventBridge Scheduler |
| Monitoring | AWS CloudWatch Logs |

---

## Active Categories (10/10)

| # | Category | ID | Scope |
|---|----------|----|-------|
| 1 | Build | `build` | frontend + backend |
| 2 | Lint | `lint` | frontend + backend |
| 3 | Test | `test` | frontend + backend |
| 4 | Security | `security` | full stack |
| 5 | Code Quality | `quality` | full stack |
| 6 | Performance | `performance` | frontend focus |
| 7 | Accessibility | `accessibility` | frontend |
| 8 | UI/UX | `uiux` | frontend (code-based) |
| 9 | User Flow | `userflow` | frontend (code-based) |
| 10 | Database | `db` | backend + schema |
