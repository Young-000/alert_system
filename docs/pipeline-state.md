# Pipeline State — Native App v2.0

> 마지막 업데이트: Cycle 24 시작 (2026-02-19)

## In-Flight Features

| Feature | ID | Phase | Status | Branch | Cycle |
|---------|:--:|:-----:|:------:|--------|:-----:|
| Expo 프로젝트 셋업 + 네비게이션 + JWT 인증 | P1-1 | Build (0-1-2) | 🔄 IN PROGRESS | feature/expo-setup | 24 |

## Phase 1: 작동하는 위젯 (2주 목표)

| Feature | ID | Status | PR | Effort |
|---------|:--:|:------:|:--:|:------:|
| Expo 프로젝트 셋업 + 네비게이션 + JWT 인증 | P1-1 | 🔄 IN PROGRESS | - | M |
| 홈 화면 (출근 브리핑 + 실시간 교통 + 경로) | P1-2 | PENDING | - | L |
| 알림 설정 화면 (CRUD + 토글) | P1-3 | PENDING | - | M |
| 경로 설정 + 설정 + 알림 기록 화면 | P1-4 | PENDING | - | M |
| FCM/APNs 푸시 알림 | P1-5 | PENDING | - | M |
| iOS WidgetKit (Small + Medium) | P1-6 | PENDING | - | L |
| Android Widget | P1-7 | PENDING | - | M |
| 앱 아이콘 + 스플래시 + 스토어 에셋 | P1-8 | PENDING | - | S |

## Phase 2: 스마트 출발 (3주 목표)

| Feature | ID | Status | Effort |
|---------|:--:|:------:|:------:|
| Geofence 자동 출퇴근 감지 | P2-1 | PENDING | L |
| 스마트 출발 알림 | P2-2 | PENDING | L |
| 상황 인식 브리핑 | P2-3 | PENDING | M |
| 퇴근 모드 | P2-4 | PENDING | M |
| iOS Live Activity | P2-5 | PENDING | M |

## Phase 3: 출퇴근 코치 (4주 목표)

| Feature | ID | Status | Effort |
|---------|:--:|:------:|:------:|
| 패턴 분석 ML | P3-1 | PENDING | L |
| 도전/목표 시스템 | P3-2 | PENDING | M |
| 스트릭 강화 + 마일스톤 + 배지 | P3-3 | PENDING | M |
| 주간/월간/연간 리포트 | P3-4 | PENDING | L |
| 대안 경로 제시 | P3-5 | PENDING | L |

## Phase 4: 데이터 플라이휠 (3주 목표)

| Feature | ID | Status | Effort |
|---------|:--:|:------:|:------:|
| 구간별 혼잡도 | P4-1 | PENDING | L |
| 지역별 출퇴근 인사이트 | P4-2 | PENDING | M |
| 소셜 기능 | P4-3 | PENDING | L |
| 예측 고도화 | P4-4 | PENDING | M |

## Previous (PWA v1.0 — Completed)

- Phase 1-3: Feature 7/7 완료 (F-1~F-7)
- Phase 4: Quality 8/8 완료 (Q-1~Q-8, 포함 optional Q-4, Q-5)
- 총 1041 테스트, 번들 13KB gzip, 보안 감사 완료, 접근성 테스트 완료

## Notes

- v2.0: PWA → Native App 피벗 (React Native + Expo)
- 기존 NestJS 백엔드 API 50+ 엔드포인트 그대로 재사용
- Pipeline 모드: 최대 2개 feature 동시 진행
