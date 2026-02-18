# Cycle Brief — P2-4: 퇴근 모드

> Cycle 35 | Feature: return-mode | Branch: feature/return-mode

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. Phase 1 완료 (8개 feature, PR #45-#52).
Phase 2 진행 중. P2-1 Geofence (#53), P2-2 Smart Departure (#54), P2-3 Context Briefing (#55) 완료.
네 번째 아이템: 퇴근 모드.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (NestJS, JWT 인증)
- **Push**: expo-notifications (P1-5에서 구현)
- **Smart Departure**: P2-2에서 구현 (출근/퇴근 설정 지원)
- **Briefing**: P2-3에서 구현 (시간대별 브리핑)

## P2-4 스코프

### 목표
오후 시간대에 앱/위젯을 자동으로 퇴근 모드로 전환.
귀가 시간 예측, 퇴근 경로 교통 정보, 퇴근 브리핑을 제공.

### 핵심 기능
1. **시간대별 모드 전환**: 오후 2시 이후 자동으로 퇴근 모드 UI
2. **귀가 시간 예측**: 퇴근 경로 기반 도착 예상 시간
3. **퇴근 브리핑**: 귀가 교통 상황 + 저녁 날씨 + 미세먼지
4. **위젯 퇴근 모드**: 오후 시간대 위젯 내용 전환
5. **퇴근 Smart Departure**: P2-2의 'return' 타입 설정 연동

### 기존 인프라 (재사용)
- `SmartDepartureSetting` — P2-2 (departureType: 'return' 지원)
- `BriefingAdviceService` — P2-3 (timeContext 지원)
- `WidgetDataService` — 위젯 데이터
- `commute_routes` — 경로 정보
- `commute_sessions` — 소요시간 히스토리
- P2-1 Geofence — 회사 이탈 감지

### 기존 앱 구조
- `mobile/app/(tabs)/index.tsx` — 홈 화면
- `mobile/src/components/briefing/` — 브리핑 카드
- `mobile/src/components/smart-departure/` — 출발 카드
- `backend/src/application/services/widget-data.service.ts` — 위젯 데이터

## 성공 기준

- [ ] 오후 2시 이후 홈 화면 자동 퇴근 모드 전환
- [ ] 퇴근 경로 교통 상황 표시
- [ ] 귀가 예상 시간 계산
- [ ] 퇴근 브리핑 (저녁 날씨/교통)
- [ ] 위젯 퇴근 모드 데이터
- [ ] Backend: 퇴근 모드 API (시간대별 데이터 분기)
- [ ] 출근/퇴근 모드 수동 전환 지원
- [ ] TypeScript 에러 0개
