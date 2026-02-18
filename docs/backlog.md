# Backlog — Native App v2.0

> 목표: 2주 내 Phase 1 (위젯 MVP), 3개월 내 Phase 4 완료
> 모드: Pipeline (최대 2개 동시 진행)
> 팀: Fullstack (PM + FE Dev + BE Dev + QA + PD)

## Phase 1: 작동하는 위젯 (2주)

### Next

| ID | 항목 | 노력 | Phase | 비고 |
|----|------|------|-------|------|
| P1-1 | Expo 프로젝트 셋업 + 네비게이션 + JWT 인증 | M | 1 | expo-router, secure-store |
| P1-2 | 홈 화면 (출근 브리핑 + 실시간 교통 + 경로) | L | 1 | 기존 API 연동 |
| P1-3 | 알림 설정 화면 (CRUD + 토글) | M | 1 | 기존 /alerts API |
| P1-4 | 경로 설정 + 설정 + 알림 기록 화면 | M | 1 | 기존 API 연동 |
| P1-5 | FCM/APNs 푸시 알림 | M | 1 | BE: 푸시 채널 추가, FE: expo-notifications |
| P1-6 | iOS WidgetKit (Small + Medium) | L | 1 | 날씨 + 교통 + 다음 알림 |
| P1-7 | Android Widget | M | 1 | Glance 또는 RemoteViews |
| P1-8 | 앱 아이콘 + 스플래시 + 스토어 에셋 | S | 1 | TestFlight / 내부 테스트 |

## Phase 2: 스마트 출발 (3주)

### Later

| ID | 항목 | 노력 | Phase | 비고 |
|----|------|------|-------|------|
| P2-1 | Geofence 자동 출퇴근 감지 | L | 2 | expo-location, 집/회사 반경 |
| P2-2 | 스마트 출발 알림 (optimal-departure → 위젯 + 푸시) | L | 2 | 기존 API 활용, 위젯 업그레이드 |
| P2-3 | 상황 인식 브리핑 ("코트 입으세요", "마스크 필수") | M | 2 | 날씨/미세먼지 기반 조언 |
| P2-4 | 퇴근 모드 (귀가 시간 예측 + 교통) | M | 2 | 오후 시간대 위젯 전환 |
| P2-5 | iOS Live Activity (출퇴근 중 실시간 표시) | M | 2 | ActivityKit |

## Phase 3: 출퇴근 코치 (4주)

| ID | 항목 | 노력 | Phase | 비고 |
|----|------|------|-------|------|
| P3-1 | 패턴 분석 ML (요일/날씨/계절별 예측) | L | 3 | BE 모델 + 개인 데이터 |
| P3-2 | 도전/목표 시스템 ("40분 이내 출근 3일") | M | 3 | 미션 + 보상 UI |
| P3-3 | 스트릭 강화 + 마일스톤 + 배지 | M | 3 | 기존 streak API 확장 |
| P3-4 | 주간/월간/연간 리포트 | L | 3 | 시각화 + 인사이트 |
| P3-5 | 대안 경로 제시 ("2호선 지연 → 9호선 환승") | L | 3 | 실시간 교통 + 경로 비교 |

## Phase 4: 데이터 플라이휠 (3주)

| ID | 항목 | 노력 | Phase | 비고 |
|----|------|------|-------|------|
| P4-1 | 구간별 혼잡도 (사용자 데이터 기반) | L | 4 | 집계 파이프라인 |
| P4-2 | 지역별 출퇴근 인사이트 | M | 4 | 통계 대시보드 |
| P4-3 | 소셜 기능 (같은 경로 커뮤니티) | L | 4 | 선택 사항 |
| P4-4 | 예측 고도화 (네트워크 효과) | M | 4 | 사용자 수 비례 정확도 |

## Done (PWA v1.0)

- [x] PWA 프론트엔드 (React + Vite) — Vercel 배포
- [x] NestJS 백엔드 — AWS ECS Fargate
- [x] 50+ REST API endpoints
- [x] EventBridge Scheduler (알림 스케줄링)
- [x] Solapi 카카오 알림톡
- [x] 실시간 교통 (Seoul Open API)
- [x] 날씨/미세먼지 API 연동
- [x] 경로 설정 + 출퇴근 트래킹
- [x] 스트릭/주간 리포트 API
- [x] optimal-departure API
- [x] 행동 패턴 분석 API
- [x] 1041 테스트 (FE 394 + BE 647)
- [x] 번들 최적화 (13KB gzip)
- [x] 보안 감사 완료
- [x] 접근성 테스트 완료

---
*마지막 업데이트: 2026-02-19 (Native App Pivot)*
