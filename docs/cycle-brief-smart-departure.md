# Cycle Brief — P2-2: 스마트 출발 알림

> Cycle 33 | Feature: smart-departure | Branch: feature/smart-departure

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. Phase 1 완료 (8개 feature, PR #45-#52).
Phase 2 진행 중. P2-1 (Geofence 자동 출퇴근 감지) 완료 (PR #53).
두 번째 아이템: 스마트 출발 알림.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (NestJS, JWT 인증)
- **Push**: expo-notifications (P1-5에서 구현)
- **Scheduling**: AWS EventBridge Scheduler (기존 알림 시스템)
- **Android Package**: `com.commutemate.app`
- **iOS Bundle ID**: `com.commutemate.app`

## P2-2 스코프

### 목표
실시간 교통 상황과 날씨를 고려하여 최적 출발 시간을 계산하고,
출발 시각 전에 푸시 알림 + 위젯 업데이트로 사용자에게 알림.

### 핵심 기능
1. **최적 출발 시간 계산**: 도착 희망 시각 - 예상 소요시간(교통 반영) - 준비시간
2. **스마트 푸시 알림**: 출발 X분 전 + 출발 시각에 푸시 알림
3. **위젯 업데이트**: 홈 화면 위젯에 "출발까지 N분" 표시
4. **교통 상황 반영**: 실시간 교통 API → 예상 소요시간 동적 계산
5. **학습/패턴**: 이전 출퇴근 기록 기반 평균 소요시간 참고

### 기존 인프라 (재사용 가능)
- `expo-notifications` — P1-5에서 구현 (FCM/APNs)
- EventBridge Scheduler — 기존 알림 스케줄링 시스템
- `commute_sessions` 테이블 — 소요시간 히스토리
- `commute_routes` 테이블 — 경로 정보
- `user_places` 테이블 — P2-1에서 구현 (집/회사 위치)
- iOS WidgetKit + Android Widget — P1-6, P1-7에서 구현

### 기존 앱 구조
- `mobile/app/(tabs)/index.tsx` — 홈 화면 (출근 브리핑)
- `mobile/src/services/` — API 서비스 레이어
- `mobile/src/hooks/` — 커스텀 훅
- `backend/src/presentation/modules/alert.module.ts` — 기존 알림 모듈

## 성공 기준

- [ ] 도착 희망 시각 설정 (출근/퇴근 별도)
- [ ] 준비시간 설정 (기본 30분)
- [ ] 실시간 교통 기반 예상 소요시간 계산
- [ ] 최적 출발 시각 계산 (도착 희망 - 소요시간 - 준비시간)
- [ ] 출발 전 사전 알림 (30분 전, 10분 전 등 설정 가능)
- [ ] 출발 시각 알림 (푸시)
- [ ] 위젯에 "출발까지 N분" 카운트다운 표시
- [ ] Backend: 출발 시간 계산 API
- [ ] 교통 상황 변화 시 동적 재계산
- [ ] TypeScript 에러 0개
