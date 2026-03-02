# Cycle Brief — alert_system (PWA)

> 사이클 시작 시 에이전트가 읽는 압축된 프로젝트 컨텍스트. CLAUDE.md 전체를 읽을 필요 없음.

## 프로젝트 개요
출근/퇴근 시 날씨, 미세먼지, 버스/지하철 도착시간 통합 알림 PWA 시스템.
모바일 우선 설계 — 스마트폰에서 주로 사용하는 서비스.

## 기술 스택
- **Backend**: NestJS + TypeORM → AWS ECS Fargate + CloudFront
- **Frontend (PWA)**: React 18 + Vite + TypeScript → Vercel
- **DB**: Supabase PostgreSQL (schema: `alert_system`)
- **Scheduling**: AWS EventBridge Scheduler
- **Push**: Web Push (VAPID)
- **State**: React Query (@tanstack/react-query)
- **Styling**: 커스텀 CSS (index.css 중심)

## API Base URLs
- Production: `https://d1qgl3ij2xig8k.cloudfront.net`
- Local: `http://localhost:3001`

## 프로젝트 경로
- Backend: `/Users/Young/Desktop/claude-workspace/projects/alert_system/backend/`
- Frontend: `/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/`

## Frontend 구조
```
frontend/src/
  domain/              — 타입 정의
  infrastructure/
    api/               — ApiClient + *-api.client.ts
    query/             — React Query hooks (use-*-query.ts)
  presentation/
    components/        — 공유 컴포넌트 (Toast, OfflineBanner 등)
    pages/             — 라우트 페이지
      home/            — 홈 (AlertSection, StatsSection 등)
      missions/        — 미션 (MissionsPage, MissionSettingsPage 등)
      alert-settings/  — 알림 설정
      commute-dashboard/ — 출퇴근 대시보드
      route-setup/     — 경로 설정
    styles/pages/      — 페이지별 CSS
    index.css          — 글로벌 CSS + 스켈레톤
```

## Backend 모듈 구조
```
presentation/modules/
  app, user, auth, alert, bus, subway, weather, air-quality,
  commute, push, notification, notification-history, behavior,
  privacy, smart-notification, mission
presentation/controllers/
  mission.controller.ts — /missions/* 엔드포인트
```

## 기존 Backend API (활용 가능)
- GET /weather/current?lat=&lon= — 현재 날씨
- GET /air-quality/location?lat=&lon= — 미세먼지
- GET /subway/arrivals/:stationName — 지하철 도착
- GET /bus/arrivals/:stationId — 버스 도착
- GET /commute/streak/:userId — 출퇴근 스트릭
- GET /commute/report/:userId?weekOffset= — 주간 리포트
- GET /behavior/patterns/:userId — 행동 패턴 분석
- GET /missions/daily — 오늘 미션 현황
- GET /missions/stats/weekly — 주간 미션 통계

## 완료된 PWA 기능
- 회원가입/로그인 (JWT + Google OAuth)
- 날씨/미세먼지/버스/지하철 API 연동 + 홈 날씨 카드
- 알림 CRUD + EventBridge 스케줄링 + 알림톡(Solapi)
- 경로 설정 (템플릿 + 커스텀) + 출퇴근 트래킹
- 미션 시스템 (CRUD + 체크인 + 스트릭 + 주간통계)
- PWA + Push 알림
- 하단 네비게이션 (홈/경로/미션/알림/설정)

## 완료된 추가 기능 (Phase 2-3)
- **P2-3**: ✅ 상황 인식 브리핑 (어드바이스 칩) — PR #79
- **P2-4**: ✅ 퇴근 모드 (useCommuteMode + ModeBadge) — PR #80
- **P3-3**: ✅ 스트릭 배지 (5단계 + 컬렉션 패널) — PR #81
- **P3-4**: ✅ 리포트 페이지 (3탭: 주간/월간/요약) — PR #82

## 현재 백로그 (Next)
1. **P3-1**: 패턴 분석 ML (요일/날씨/계절별 예측) — BE 모델 + 개인 데이터
2. **P3-5**: 대안 경로 제시 ("2호선 지연 → 9호선 환승") — 실시간 교통 + 경로 비교
3. **P4-1~P4-4**: Phase 4 (구간별 혼잡도, 인사이트, 소셜, 예측 고도화)

## 모바일 우선 설계 원칙
- 375px viewport 기준 디자인
- 하단 고정 네비게이션 (이미 구현)
- 터치 타겟 최소 44x44px
- 카드 기반 레이아웃
- 스크롤 가능한 메인 콘텐츠 영역
- 텍스트 가독성 (16px 이상 본문)
- 색상 대비 WCAG AA 준수

## 테스트 현황
- Backend: 892 passed
- Frontend: 481 passed (Vitest)
- E2E 점검: 10/10 ✅ (Round 5, 134건 수정)

## 배포
- Backend: `aws ecs update-service --cluster alert-system-prod-cluster --service alert-system-prod-service --force-new-deployment`
- Frontend: Vercel 자동 배포 (main merge 시)

## 코드 컨벤션 (요약)
- TypeScript strict mode, no `any`
- camelCase 변수, PascalCase 컴포넌트/타입
- 함수형 컴포넌트 + 커스텀 훅 패턴
- Early return, immutability, pure functions
- 행위 기반 테스트 (AAA 패턴)
- API: ApiClient 래퍼 + React Query hooks
