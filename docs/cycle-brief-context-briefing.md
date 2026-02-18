# Cycle Brief — P2-3: 상황 인식 브리핑

> Cycle 34 | Feature: context-briefing | Branch: feature/context-briefing

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. Phase 1 완료 (8개 feature, PR #45-#52).
Phase 2 진행 중. P2-1 (Geofence) 완료 (#53), P2-2 (Smart Departure) 완료 (#54).
세 번째 아이템: 상황 인식 브리핑.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (NestJS, JWT 인증)
- **Push**: expo-notifications (P1-5에서 구현)
- **Android Package**: `com.commutemate.app`
- **iOS Bundle ID**: `com.commutemate.app`

## P2-3 스코프

### 목표
날씨, 미세먼지, 교통 상황을 종합하여 사용자에게 맥락 있는 출근 브리핑을 제공.
단순 데이터 나열이 아닌, 실생활 조언 형태 ("코트 입으세요", "마스크 필수", "2호선 지연 중").

### 핵심 기능
1. **통합 브리핑 카드**: 날씨+미세먼지+교통을 하나의 카드로 요약
2. **상황별 조언**: 날씨/미세먼지/교통 상태에 따른 실생활 팁
3. **아이콘+색상 코딩**: 상황 심각도별 시각적 구분 (좋음/보통/나쁨/매우나쁨)
4. **시간대별 브리핑**: 출근 시간대 vs 퇴근 시간대 다른 메시지
5. **Backend API**: 브리핑 데이터 조합 엔드포인트

### 기존 인프라 (재사용 가능)
- `WeatherService` — 기존 날씨 API 연동 (OpenWeatherMap)
- `AirQualityService` — 미세먼지 API (공공데이터)
- `SubwayArrivalService` — 지하철 실시간 도착 정보
- `BusArrivalService` — 버스 실시간 도착 정보
- `commute_routes` 테이블 — 경로 정보 (교통수단)
- `alerts` 테이블 — 알림 설정 (시간대)
- P1-2 홈 화면 — 기존 브리핑 UI 있음

### 기존 앱 구조
- `mobile/app/(tabs)/index.tsx` — 홈 화면 (출근 브리핑)
- `mobile/src/services/` — API 서비스 레이어
- `mobile/src/hooks/` — 커스텀 훅
- `backend/src/application/services/weather.service.ts` — 날씨
- `backend/src/application/services/air-quality.service.ts` — 미세먼지

## 성공 기준

- [ ] 날씨 기반 조언 (기온별 옷차림, 우산 여부)
- [ ] 미세먼지 기반 조언 (마스크 필요 여부, 실외 활동 자제)
- [ ] 교통 지연 알림 (지하철/버스 지연 정보)
- [ ] 통합 브리핑 카드 UI (아이콘+색상+조언 텍스트)
- [ ] 시간대별 브리핑 (출근/퇴근 모드)
- [ ] Backend: 브리핑 조합 API
- [ ] Widget: 브리핑 요약 표시
- [ ] TypeScript 에러 0개
