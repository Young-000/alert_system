# Cycle Brief — P1-7: Android Widget

> Cycle 30 | Feature: android-widget | Branch: feature/android-widget

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. P1-1~P1-6 완료 (4개 탭 + 푸시 + iOS 위젯).
이번 사이클에서 Android 홈 화면 위젯을 추가.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (JWT 인증)
- **Android Package**: `com.commutemate.app`
- **기존 위젯 API**: GET /widget/data (P1-6에서 구현 완료)

## P1-7 스코프

### 목표
Android 홈 화면 위젯 (Small 4x1 + Medium 4x2) 구현.
iOS 위젯(P1-6)과 동일한 데이터를 Android에서도 위젯으로 제공.

### 기존 인프라 (P1-6에서 구현)
1. **GET /widget/data** — 위젯 데이터 집계 API (재사용)
2. **WidgetDataResponse** TypeScript 타입 (재사용)
3. **fetchWidgetData()** API 서비스 함수 (재사용)
4. **widget-sync.service.ts** — iOS 전용, Android 확장 필요

### Android 위젯 기술 옵션

**옵션 1: `react-native-android-widget`**
- React Native JSX로 위젯 작성 (네이티브 Kotlin 불필요)
- Expo config plugin 제공 (managed workflow 지원)
- 커뮤니티에서 가장 활발하게 사용

**옵션 2: Jetpack Glance (Custom Config Plugin)**
- Kotlin + Compose로 위젯 작성
- Custom config plugin으로 Expo에서 사용
- 네이티브 Kotlin 필요 → 복잡도 증가

**옵션 3: Traditional RemoteViews**
- XML 레이아웃 + Kotlin AppWidgetProvider
- 가장 전통적이지만 가장 제한적

### 데이터 공유 (Android)

Android에서는 SharedPreferences를 통해 앱 ↔ 위젯 데이터 공유:
```
앱 (React Native)
  → SharedPreferences에 JSON 데이터 저장
  → Widget에서 SharedPreferences 읽기
  → 위젯 갱신
```

### 위젯 디자인 (iOS와 동일한 정보)

**Small (4x1)**
```
┌──────────────────────────────────┐
│ ☀️ 3° 미세먼지 좋음 | ⏰ 07:30    │
└──────────────────────────────────┘
```

**Medium (4x2)**
```
┌──────────────────────────────────┐
│ ☀️ 3°C 체감 -2° | 미세먼지 좋음(35)│
│ ⏰ 07:30 출근 | 🚇 강남역 3분     │
└──────────────────────────────────┘
```

### 참고 파일

**모바일 (기존 — P1-6):**
- `mobile/src/services/widget-sync.service.ts` — iOS 전용, Android 확장 필요
- `mobile/modules/widget-data-sync/index.ts` — iOS 네이티브 모듈
- `mobile/src/hooks/useHomeData.ts` — 위젯 데이터 sync 호출 위치
- `mobile/src/services/home.service.ts` — fetchWidgetData() 함수
- `mobile/src/types/home.ts` — WidgetDataResponse 타입
- `mobile/app.json` — Expo 설정

## 성공 기준

- [ ] Small 위젯: 날씨 + 미세먼지 + 다음 알림 시간 표시
- [ ] Medium 위젯: 위 + 교통 정보 추가
- [ ] 위젯 탭 → 앱 열기
- [ ] 위젯 데이터 자동 갱신
- [ ] widget-sync.service.ts가 iOS + Android 모두 지원
- [ ] TypeScript 에러 0개
- [ ] 기존 앱/iOS 위젯 동작에 영향 없음
