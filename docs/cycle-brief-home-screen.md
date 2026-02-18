# Cycle Brief — P1-2: 홈 화면 (출근 브리핑 + 실시간 교통 + 경로)

> Cycle 25 | Feature: home-screen | Branch: feature/home-screen

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. P1-1에서 Expo 프로젝트 셋업 완료 (PR #45).
이번 사이클에서 홈 화면을 실제 기능으로 구현.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
  - 기존 코드: `mobile/` 디렉토리 (P1-1에서 생성)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net`
  - 50+ REST endpoints (JWT 인증)

## P1-2 스코프

### 목표
P1-1에서 플레이스홀더였던 홈 탭을 실제 출근 브리핑 화면으로 구현.

### 핵심 기능
1. **날씨 카드**: 현재 온도, 날씨 상태, 미세먼지 수준
2. **실시간 교통 카드**: 저장된 경로의 지하철/버스 도착 정보
3. **경로 요약 카드**: 설정된 출퇴근 경로 + 예상 소요 시간
4. **출근 브리핑**: "7°C 맑음 · 미세먼지 좋음 · 강남역→홍대 29분"

### 기존 백엔드 API (재사용)

```
GET /weather/current          — 현재 날씨 + 미세먼지
GET /subway/realtime/:station — 지하철 실시간 도착 정보
GET /bus/realtime/:routeId    — 버스 실시간 도착 정보
GET /routes/user/:userId      — 사용자 저장 경로 목록
GET /traffic/realtime         — 실시간 교통 종합 (경로별)
GET /optimal-departure/:userId — 최적 출발 시각 (Phase 2용, 미리 연동 가능)
```

### 참고 파일 (기존 PWA)

- `frontend/src/presentation/pages/home/HomePage.tsx` — 기존 홈 화면
- `frontend/src/infrastructure/api/index.ts` — API 클라이언트 메서드 목록
- `mobile/src/services/api-client.ts` — 모바일 API 클라이언트 (P1-1)
- `mobile/app/(tabs)/index.tsx` — 현재 플레이스홀더 (이 파일을 교체)

### PWA 홈 화면에서 가져올 것
- 날씨/미세먼지 표시 로직
- 실시간 교통 갱신 패턴 (30초 간격)
- "좋은 아침이에요!" 인사 메시지

### 네이티브 앱에서 개선할 것
- 더 깔끔한 카드 기반 UI (RN StyleSheet)
- Pull-to-refresh로 수동 갱신
- 로딩 스켈레톤 (Placeholder)

## 성공 기준

- [ ] 홈 탭에 날씨 카드 (온도, 상태, 미세먼지)
- [ ] 실시간 교통 카드 (지하철/버스 도착 정보)
- [ ] 경로 요약 카드 (저장된 경로, 소요 시간)
- [ ] Pull-to-refresh 동작
- [ ] 30초 자동 갱신 (교통 정보)
- [ ] 로딩 스켈레톤 표시
- [ ] 에러 시 사용자 피드백
- [ ] 경로 미설정 시 경로 설정 유도 메시지
- [ ] TypeScript 에러 0개
