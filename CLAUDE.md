# Alert System

출근/퇴근 시 날씨, 미세먼지, 버스/지하철 도착시간 통합 알림 시스템

## Overview

| 항목 | 값 |
|------|-----|
| **Frontend URL** | https://frontend-xi-two-52.vercel.app |
| **Backend URL** | https://alert-system-kdg9.onrender.com |
| **Supabase** | Project 2 - `gtnqsbdlybrkbsgtecvy` |
| **Schema** | `alert_system` |

## 기술 스택

| Backend | Frontend |
|---------|----------|
| NestJS + TypeScript | React + Vite |
| TypeORM (Supabase) | PWA |
| Redis + BullMQ | |

## 진행상황

| 영역 | 상태 |
|------|:----:|
| Frontend | ✅ |
| Backend | ✅ (Render) |
| DB 연결 | ✅ |
| 배포 | ✅ |

## DB 테이블

```sql
-- alert_system 스키마 사용
alert_system.users
alert_system.alerts
alert_system.subway_stations
alert_system.push_subscriptions
```

## 환경 변수

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres.gtnqsbdlybrkbsgtecvy:...@supabase.com:5432/postgres
DB_SYNCHRONIZE=true  # 스키마 변경 시만
AIR_QUALITY_API_KEY=...
REDIS_HOST=...
```

### Frontend (.env)
```env
VITE_API_BASE_URL=https://alert-system-kdg9.onrender.com
VITE_VAPID_PUBLIC_KEY=...
```

## 개발 명령어

```bash
# Backend
cd backend && npm run start:dev

# Frontend
cd frontend && npm run dev

# Docker
docker-compose up -d redis
```

## Known Issues (프로젝트 고유)

### Render Cold Start
Backend (Render Free Tier) 첫 요청 시 ~30초 지연
→ 프론트엔드에서 로딩 상태 표시

---

*전역 설정 참조: `workspace/CLAUDE.md`, `SUPABASE_RULES.md`*
