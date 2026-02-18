# Cycle Brief — P2-1: Geofence 자동 출퇴근 감지

> Cycle 32 | Feature: geofence-detection | Branch: feature/geofence-detection

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. Phase 1 완료 (8개 feature, PR #45-#52).
Phase 2 "스마트 출발" 시작. 첫 아이템: Geofence 자동 출퇴근 감지.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (NestJS, JWT 인증)
- **Location**: `expo-location` (이미 Expo SDK에 포함)
- **Android Package**: `com.commutemate.app`
- **iOS Bundle ID**: `com.commutemate.app`

## P2-1 스코프

### 목표
사용자의 집/회사 위치를 기반으로 출퇴근 시작/종료를 자동 감지.
수동 출퇴근 트래킹(P1-4)을 자동화하여 UX 마찰 최소화.

### 핵심 기능
1. **장소 등록**: 집/회사 위치 설정 (지도 핀 또는 현재 위치)
2. **Geofence 모니터링**: 등록 장소 반경 진입/이탈 감지
3. **자동 출퇴근 기록**: Geofence 이벤트 → 출퇴근 시작/종료 자동 기록
4. **백그라운드 위치**: Background location tracking (배터리 최적화)
5. **Backend API**: 장소 CRUD + 출퇴근 이벤트 기록

### 기존 인프라 (재사용 가능)
- `expo-location` — Expo SDK에 포함
- `commute_sessions` 테이블 — P1-4에서 구현
- `commute_routes` 테이블 — P1-4에서 구현
- JWT 인증 — P1-1에서 구현

### 기존 앱 구조
- `mobile/app/(tabs)/settings.tsx` — 설정 화면 (장소 등록 진입점)
- `mobile/src/services/` — API 서비스 레이어
- `mobile/src/hooks/` — 커스텀 훅

## 성공 기준

- [ ] 집/회사 위치 등록 (지도 + 현재 위치)
- [ ] Geofence 반경 설정 (기본 200m, 조절 가능)
- [ ] 집 이탈 → 출근 시작 자동 감지
- [ ] 회사 진입 → 출근 완료 자동 감지
- [ ] 회사 이탈 → 퇴근 시작 자동 감지
- [ ] 백그라운드 위치 권한 요청 + 처리
- [ ] 배터리 최적화 (Geofence만 사용, 연속 GPS 아님)
- [ ] Backend: 장소 CRUD API
- [ ] Backend: 출퇴근 이벤트 기록 API
- [ ] TypeScript 에러 0개
