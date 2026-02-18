# Cycle Brief — P1-6: iOS WidgetKit (Small + Medium)

> Cycle 29 | Feature: ios-widget | Branch: feature/ios-widget

## 프로젝트 컨텍스트

출퇴근 메이트 — Native App v2.0. P1-1~P1-5 완료 (4개 탭 + 푸시 알림).
이번 사이클에서 iOS 위젯을 추가하여 잠금 화면/홈 화면에서 출퇴근 정보를 한눈에 확인.

## 기술 스택

- **Mobile App**: React Native + Expo (SDK 54, expo-router)
- **Backend API**: `https://d1qgl3ij2xig8k.cloudfront.net` (JWT 인증)
- **Bundle ID**: `com.commutemate.app`

## P1-6 스코프

### 목표
iOS WidgetKit Small(2x2) + Medium(4x2) 위젯 구현.
잠금 화면/홈 화면에서 출퇴근 브리핑을 한눈에 확인할 수 있게 함.

### 위젯 데이터 (기존 API 활용)

| 데이터 | API 엔드포인트 | 위젯 표시 |
|--------|---------------|-----------|
| 날씨 | GET /weather/current?lat=&lng= | 온도 + 아이콘 |
| 미세먼지 | GET /air-quality/location?lat=&lng= | PM10 수치 + 상태 |
| 다음 알림 | GET /alerts/user/:userId | 다음 알림 시간 |
| 교통 | GET /subway/arrival/:station | 첫 번째 도착 시간 |

### 기술적 도전: WidgetKit + Expo

WidgetKit은 네이티브 Swift 코드 필요. Expo managed workflow에서의 접근법:

**옵션 1: `@anthropic/expo-apple-targets` (또는 community fork)**
- Expo config plugin으로 WidgetKit extension 타겟 자동 추가
- SwiftUI 위젯 코드를 별도 타겟으로 빌드
- Expo managed workflow 유지 가능

**옵션 2: Custom Expo config plugin**
- `withIosWidget` config plugin 직접 작성
- Xcode project에 WidgetKit extension 타겟 자동 주입
- pbxproj 파일 직접 조작

**옵션 3: `react-native-widget-extension`**
- 커뮤니티 라이브러리
- React Native에서 위젯 데이터 전달 → Swift 위젯에서 렌더링

### 위젯 ↔ 앱 데이터 공유

iOS에서 앱과 위젯은 별도 프로세스. App Groups를 통해 데이터 공유:

```
앱 (React Native)
  → UserDefaults(suiteName: "group.com.commutemate.app")에 데이터 저장
  → WidgetKit에서 Timeline Provider가 UserDefaults 읽기
  → 위젯 갱신
```

### 위젯 디자인 (Small 2x2)

```
┌────────────────┐
│ ☀️ 3° 미세먼지 좋음│
│                │
│ 다음 알림 07:30 │
│ 🚇 강남역 3분   │
└────────────────┘
```

### 위젯 디자인 (Medium 4x2)

```
┌─────────────────────────────────┐
│ ☀️ 3° C  미세먼지 좋음 (PM10: 35) │
│                                 │
│ ⏰ 다음 알림: 07:30 (출근)        │
│ 🚇 강남역 2호선 3분 / 🚌 146번 5분 │
└─────────────────────────────────┘
```

### 백엔드 변경사항

**위젯 전용 API (NEW)**
```
GET /widget/data — 위젯에 필요한 모든 데이터를 한 번에 반환
```

단일 API 호출로 위젯 데이터 취합 (날씨 + 미세먼지 + 다음 알림 + 교통):
- 위젯 Timeline Provider에서 네트워크 호출 최소화
- 배터리/데이터 효율 극대화
- JWT 인증 필요 (App Groups에서 토큰 공유)

### 모바일 변경사항

1. **App Groups 설정**: `group.com.commutemate.app`
2. **SharedData 모듈**: RN → UserDefaults로 데이터 저장
3. **Widget Extension**: SwiftUI WidgetKit 코드
4. **Config Plugin**: Expo config에 WidgetKit extension 자동 추가

### 참고 파일

**모바일 (기존):**
- `mobile/app/(tabs)/index.tsx` — 홈 화면 (위젯과 유사한 데이터)
- `mobile/src/hooks/useHomeData.ts` — 홈 데이터 훅 (API 호출 패턴)
- `mobile/src/services/home.service.ts` — API 호출 서비스
- `mobile/src/types/home.ts` — 타입 정의
- `mobile/app.json` — Expo 설정

**백엔드 (기존):**
- `backend/src/presentation/controllers/weather.controller.ts`
- `backend/src/presentation/controllers/air-quality.controller.ts`
- `backend/src/presentation/controllers/alert.controller.ts`
- `backend/src/presentation/controllers/subway.controller.ts`

## 성공 기준

- [ ] Small 위젯: 날씨 + 미세먼지 + 다음 알림 시간 표시
- [ ] Medium 위젯: 위 + 교통 정보 추가
- [ ] 위젯 탭 → 앱 열기 (딥링크)
- [ ] 위젯 데이터 자동 갱신 (Timeline Provider)
- [ ] App Groups를 통한 앱 ↔ 위젯 데이터 공유
- [ ] 백엔드 /widget/data 엔드포인트
- [ ] TypeScript 에러 0개
- [ ] 기존 앱 동작에 영향 없음
