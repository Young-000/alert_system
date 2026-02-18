# P1-2: 홈 화면 (출근 브리핑 + 실시간 교통 + 경로)

> Cycle 25 | Branch: `feature/home-screen` | 작성일: 2026-02-19

---

## JTBD

**When** 아침에 출근 준비를 하며 앱을 열 때,
**I want to** 날씨, 미세먼지, 실시간 교통 정보를 한 화면에서 보고 싶어서,
**So I can** 우산/마스크 챙길지, 지하철이 몇 분 후 오는지를 10초 안에 파악하고 최적의 타이밍에 출발할 수 있다.

---

## Problem

| 항목 | 내용 |
|------|------|
| **Who** | 매일 대중교통(지하철/버스)으로 출퇴근하는 수도권 직장인. 아침에 날씨 앱 + 미세먼지 앱 + 지하철 앱을 각각 확인하는 사용자. |
| **Pain** | 매일 3~4개 앱을 열어야 해서 2~3분 낭비 (빈도: 매일 / 심각도: 중간). 급하게 나갈 때 우산이나 마스크를 빠뜨림. |
| **현재 해결책** | PWA 홈 화면에서 브리핑 + 교통 정보 제공 중. 그러나 PWA 특성상 앱 전환 느리고, Pull-to-refresh 미지원, 백그라운드 갱신 불가. |
| **성공 지표** | 홈 화면 진입 후 5초 이내 전체 데이터 로딩 완료. 교통 정보 30초 자동 갱신. |

---

## Solution

### Overview

기존 PWA 홈 화면(`HomePage.tsx`)의 기능을 React Native 네이티브 화면으로 재구현한다. 카드 기반 레이아웃으로 정보 밀도를 높이면서, Pull-to-refresh와 30초 자동 갱신으로 PWA보다 향상된 실시간성을 제공한다.

모든 데이터는 기존 백엔드 API를 그대로 사용한다. 신규 백엔드 작업 없음.

### PWA 대비 개선 사항

| PWA (현재) | Native (이번 구현) |
|------------|-------------------|
| 날씨 섹션 접기/펼치기 토글 | 항상 보이는 컴팩트 날씨 카드 |
| 페이지 새로고침으로만 갱신 | Pull-to-refresh + 30초 자동 갱신 |
| 브라우저 로딩 지연 (2~3초) | 네이티브 앱 즉시 실행 |
| 스켈레톤 CSS 클래스 | RN Animated 스켈레톤 (shimmer) |
| 웹 Geolocation API | expo-location (더 빠르고 정확) |

---

## 화면 레이아웃

### 전체 구조

```
┌──────────────────────────────────────┐
│ SafeAreaView (edges: ['top'])        │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Header: 인사 메시지 + 사용자명 │    │
│  └──────────────────────────────┘    │
│                                      │
│  ScrollView (RefreshControl)         │
│  ┌──────────────────────────────┐    │
│  │ [1] 브리핑 카드                │    │
│  │ "7°C 맑음 · 좋음 · 약 45분"   │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ [2] 날씨 카드                  │    │
│  │ 온도 + 날씨 상태 + 미세먼지    │    │
│  │ 습도 + 체감온도 + 조언         │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ [3] 실시간 교통 카드           │    │
│  │ 경로명 + 경로 요약             │    │
│  │ 지하철/버스 도착 정보           │    │
│  │ [마지막 갱신: 방금 전]         │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ [4] 다음 알림 카드             │    │
│  │ "다음 알림: 07:00"            │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

### 카드별 상세

#### [1] 브리핑 카드 (BriefingCard)

한 줄 요약으로 핵심 정보를 전달한다. 시간대에 따라 "출근 브리핑" / "퇴근 브리핑" / "내일 출근 브리핑" 라벨이 바뀐다.

```
┌─────────────────────────────────────┐
│ 출근 브리핑                          │
│ ☀️ 7° · 좋음 · 약 45분 예상          │
│ 강남역 3분 후 도착                    │
└─────────────────────────────────────┘
```

- **표시 조건**: 활성 경로가 있고 날씨 데이터가 있을 때
- **main 라인**: 날씨 이모지 + 온도 + 미세먼지 등급 + 예상 소요시간 (3회 이상 기록 시)
- **sub 라인**: 첫 번째 교통 도착 정보 또는 경로명 fallback
- **스타일**: 시간대별 배경색 변화 (morning: 따뜻한 톤 / evening: 차분한 톤 / tomorrow: 은은한 톤)

#### [2] 날씨 카드 (WeatherCard)

```
┌─────────────────────────────────────┐
│ ☀️  7°C                              │
│ 맑음                                 │
│                                      │
│ 미세먼지 좋음   습도 45%              │
│ 체감온도 5°C                         │
│                                      │
│ 💡 쾌적한 날씨에요                    │
└─────────────────────────────────────┘
```

- **날씨 아이콘**: SVG 대신 조건별 이모지 사용 (네이티브 렌더링 최적화)
  - sunny: `conditionEmoji` 필드 또는 조건 기반 매핑
- **온도**: `weather.temperature` (반올림, 정수 표시)
- **상태**: `weather.conditionKr` 우선, 없으면 `translateCondition(weather.condition)`
- **미세먼지**: PM10 기준 등급 (좋음/보통/나쁨/매우나쁨) + 등급별 색상 뱃지
- **습도**: `weather.humidity`%
- **체감온도**: `weather.feelsLike` (있을 때만 표시)
- **조언 텍스트**: `getWeatherAdvice()` 로직 재사용

#### [3] 실시간 교통 카드 (TransitCard)

```
┌─────────────────────────────────────┐
│ 출근 · 강남역 → 홍대입구              │
│ 집 → 강남역 → (1곳 경유) → 홍대입구   │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ 실시간 교통              방금 전     │
│                                      │
│ 🚇 지하철  강남역                     │
│           신도림행 3분                │
│                                      │
│ 🚌 버스    정류장 12345              │
│           240번 5분 (3정거장)         │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│  [          출발하기          ]       │
└─────────────────────────────────────┘
```

- **경로 헤더**: 경로 타입 뱃지 (출근/퇴근) + 경로명
- **경로 요약**: 체크포인트 이름 연결 (3개 이하: A -> B -> C, 4개 이상: A -> (N곳 경유) -> Z)
- **실시간 교통 섹션**:
  - 좌측: 교통 유형 뱃지 (지하철/버스) + 역/정류장명
  - 우측: 도착 정보 (N분 / 곧 도착)
  - 곧 도착 (2분 이내): 강조 스타일 + 번개 아이콘
- **갱신 타임스탬프**: "방금 전" / "N초 전" / "N분 전" (10초마다 UI 갱신)
- **출발하기 버튼**: 출퇴근 세션 시작 -> `/commute` 화면 이동 (Phase 1에서는 네비게이션만)

#### [4] 다음 알림 카드 (NextAlertCard)

```
┌─────────────────────────────────────┐
│ 🔔 다음 알림                         │
│ 07:00 · 날씨 + 교통 알림             │
└─────────────────────────────────────┘
```

- **표시 조건**: 활성화된 알림이 1개 이상 존재할 때
- **내용**: 다음 알림 시각 + 알림 이름
- **없을 때**: 카드 자체가 숨겨짐

---

## API 계약 (Contract)

모든 API는 기존 백엔드 엔드포인트를 사용한다. 모바일 `apiClient` (`mobile/src/services/api-client.ts`)로 호출.

### 1. 날씨 API

| 항목 | 값 |
|------|-----|
| **Endpoint** | `GET /weather/current?lat={lat}&lng={lng}` |
| **인증** | JWT Bearer Token |
| **요청 파라미터** | `lat`: number, `lng`: number |
| **응답 타입** | `WeatherData` |

```typescript
type WeatherData = {
  location: string;
  temperature: number;
  condition: string;        // 영문 날씨 상태 (e.g., "clear", "rain")
  humidity: number;
  windSpeed: number;
  feelsLike?: number;
  conditionKr: string;      // 한글 날씨 상태 (e.g., "맑음", "비")
  conditionEmoji: string;   // 이모지 (e.g., "☀️", "🌧️")
  forecast?: {
    maxTemp: number;
    minTemp: number;
    hourlyForecasts: HourlyForecast[];
  };
};
```

### 2. 미세먼지 API

| 항목 | 값 |
|------|-----|
| **Endpoint** | `GET /air-quality/location?lat={lat}&lng={lng}` |
| **인증** | JWT Bearer Token |
| **요청 파라미터** | `lat`: number, `lng`: number |
| **응답 타입** | `AirQualityData` |

```typescript
type AirQualityData = {
  location: string;
  pm10: number;
  pm25: number;
  aqi: number;
  status: string;
};
```

### 3. 사용자 경로 API

| 항목 | 값 |
|------|-----|
| **Endpoint** | `GET /routes/user/{userId}` |
| **인증** | JWT Bearer Token |
| **응답 타입** | `RouteResponse[]` |

```typescript
type RouteResponse = {
  id: string;
  userId: string;
  name: string;
  routeType: 'morning' | 'evening' | 'custom';
  isPreferred: boolean;
  totalExpectedDuration?: number;
  checkpoints: CheckpointResponse[];
  createdAt: string;
  updatedAt: string;
};

type CheckpointResponse = {
  id: string;
  sequenceOrder: number;
  name: string;
  checkpointType: 'home' | 'subway' | 'bus_stop' | 'transfer_point' | 'work' | 'custom';
  linkedStationId?: string;
  linkedBusStopId?: string;
  lineInfo?: string;
  expectedDurationToNext?: number;
  expectedWaitTime: number;
  transportMode?: 'walk' | 'subway' | 'bus' | 'transfer' | 'taxi' | 'bike';
};
```

### 4. 지하철 실시간 도착 API

| 항목 | 값 |
|------|-----|
| **Endpoint** | `GET /subway/arrival/{stationName}` |
| **인증** | JWT Bearer Token |
| **응답 타입** | `SubwayArrival[]` |

```typescript
type SubwayArrival = {
  stationId: string;
  lineId: string;
  direction: string;
  arrivalTime: number;      // 분 단위
  destination: string;      // 행선지 (e.g., "신도림")
};
```

### 5. 버스 실시간 도착 API

| 항목 | 값 |
|------|-----|
| **Endpoint** | `GET /bus/arrival/{stopId}` |
| **인증** | JWT Bearer Token |
| **응답 타입** | `BusArrival[]` |

```typescript
type BusArrival = {
  stopId: string;
  routeId: string;
  routeName: string;        // 버스 노선 번호 (e.g., "240")
  arrivalTime: number;      // 분 단위
  remainingStops: number;   // 남은 정거장 수
};
```

### 6. 알림 목록 API

| 항목 | 값 |
|------|-----|
| **Endpoint** | `GET /alerts/user/{userId}` |
| **인증** | JWT Bearer Token |
| **응답 타입** | `Alert[]` |

```typescript
type Alert = {
  id: string;
  userId: string;
  name: string;
  schedule: string;          // cron 표현식
  alertTypes: ('weather' | 'airQuality' | 'bus' | 'subway')[];
  enabled: boolean;
};
```

### 7. 출퇴근 통계 API

| 항목 | 값 |
|------|-----|
| **Endpoint** | `GET /commute/stats/{userId}?days=7` |
| **인증** | JWT Bearer Token |
| **응답 타입** | `CommuteStatsResponse` |

```typescript
type CommuteStatsResponse = {
  userId: string;
  totalSessions: number;
  overallAverageDuration: number;   // 분 단위
  overallAverageWaitTime: number;
  overallAverageDelay: number;
  insights: string[];
  // ... (상세 필드 생략)
};
```

---

## 데이터 흐름 (Data Flow)

### 아키텍처

```
┌────────────────────────────────────────────────────┐
│                    HomeScreen                       │
│  ┌──────────────────────────────────────────────┐  │
│  │           useHomeData() 커스텀 훅             │  │
│  │                                              │  │
│  │  ┌─────────┐  ┌─────────┐  ┌────────────┐  │  │
│  │  │ useState │  │useState │  │  useRef     │  │  │
│  │  │ refresh- │  │ transit │  │ interval   │  │  │
│  │  │ ing      │  │ data    │  │ timer      │  │  │
│  │  └─────────┘  └─────────┘  └────────────┘  │  │
│  │                                              │  │
│  │  fetchAll() ─┬─ fetchWeather()               │  │
│  │              ├─ fetchAirQuality()             │  │
│  │              ├─ fetchRoutes()                 │  │
│  │              ├─ fetchAlerts()                 │  │
│  │              └─ fetchCommuteStats()           │  │
│  │                                              │  │
│  │  fetchTransit() ── 30초 interval             │  │
│  │     ├─ subwayArrival(station1)               │  │
│  │     ├─ subwayArrival(station2)               │  │
│  │     ├─ busArrival(stop1)                     │  │
│  │     └─ busArrival(stop2)                     │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────┐ ┌────────────┐ ┌───────────────┐    │
│  │ Briefing │ │  Weather   │ │   Transit     │    │
│  │ Card     │ │  Card      │ │   Card        │    │
│  └──────────┘ └────────────┘ └───────────────┘    │
│  ┌──────────┐                                      │
│  │NextAlert │                                      │
│  │ Card     │                                      │
│  └──────────┘                                      │
└────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────┐
│  apiClient (mobile/src/services/api-client.ts)      │
│  - JWT 자동 주입                                    │
│  - 30초 타임아웃                                    │
│  - 네트워크 에러 자동 재시도 (2회)                   │
└────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────┐
│  Backend: https://d1qgl3ij2xig8k.cloudfront.net     │
└────────────────────────────────────────────────────┘
```

### 상태 구조 (useHomeData 훅)

```typescript
type HomeData = {
  // 로딩/에러 상태
  isLoading: boolean;           // 초기 로딩 중
  isRefreshing: boolean;        // Pull-to-refresh 중
  loadError: string | null;     // 전체 로딩 에러

  // 날씨 데이터
  weather: WeatherData | null;
  weatherError: string | null;
  airQuality: AirQualityData | null;
  airQualityError: string | null;

  // 경로 데이터
  routes: RouteResponse[];
  activeRoute: RouteResponse | null;

  // 교통 데이터
  transitInfos: TransitArrivalInfo[];
  isTransitRefreshing: boolean;
  lastTransitUpdate: number | null;

  // 알림 데이터
  alerts: Alert[];
  nextAlert: { time: string; label: string } | null;

  // 통계 데이터
  commuteStats: CommuteStatsResponse | null;

  // 액션
  onRefresh: () => Promise<void>;   // Pull-to-refresh 핸들러
  retryLoad: () => void;            // 에러 시 재시도
};
```

### 초기 로딩 시퀀스

```
앱 진입
  ├─ useAuth()에서 user 확인
  │   ├─ user 없음 → GuestView 렌더링 (로그인 유도)
  │   └─ user 있음 → 데이터 로딩 시작
  │
  ├─ 위치 확인 (서울 기본값: lat=37.5665, lng=126.9780)
  │   ├─ expo-location 권한 있음 → 현재 위치 사용
  │   └─ 권한 없음/거부 → 서울 기본값 사용 (isDefaultLocation = true)
  │
  ├─ Promise.allSettled([       // 병렬 호출
  │     fetchWeather(lat, lng),
  │     fetchAirQuality(lat, lng),
  │     fetchRoutes(userId),
  │     fetchAlerts(userId),
  │     fetchCommuteStats(userId, 7),
  │   ])
  │
  ├─ 경로 데이터 수신 후
  │   ├─ getActiveRoute(routes, 'auto') → activeRoute 결정
  │   └─ activeRoute 있으면 → fetchTransitArrivals(activeRoute) 호출
  │
  └─ isLoading = false → 화면 렌더링
```

---

## 자동 갱신 로직

### 교통 정보 (30초 간격)

```typescript
// 30초마다 교통 정보만 갱신 (날씨/경로는 갱신하지 않음)
const TRANSIT_REFETCH_INTERVAL = 30 * 1000; // 30초

useEffect(() => {
  if (!activeRoute) return;

  // 즉시 1회 호출
  fetchTransitArrivals(activeRoute);

  // 30초 interval 설정
  const intervalId = setInterval(() => {
    fetchTransitArrivals(activeRoute);
  }, TRANSIT_REFETCH_INTERVAL);

  return () => clearInterval(intervalId);
}, [activeRoute?.id]);
```

### 갱신 규칙

| 데이터 | 자동 갱신 | 트리거 |
|--------|:---------:|--------|
| 날씨 | X | Pull-to-refresh, 앱 포그라운드 복귀 시만 |
| 미세먼지 | X | Pull-to-refresh, 앱 포그라운드 복귀 시만 |
| 경로 목록 | X | Pull-to-refresh 시만 |
| 교통 도착 정보 | O (30초) | 자동 + Pull-to-refresh |
| 알림 목록 | X | Pull-to-refresh 시만 |
| 통계 | X | Pull-to-refresh 시만 |

### 앱 포그라운드 복귀 시

```typescript
import { AppState } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      // 포그라운드 복귀: 날씨 + 교통 갱신
      fetchWeather(lat, lng);
      fetchAirQuality(lat, lng);
      if (activeRoute) {
        fetchTransitArrivals(activeRoute);
      }
    }
  });
  return () => subscription.remove();
}, [activeRoute?.id]);
```

---

## Pull-to-Refresh 동작

```typescript
const handleRefresh = async (): Promise<void> => {
  setIsRefreshing(true);
  try {
    await Promise.allSettled([
      fetchWeather(lat, lng),
      fetchAirQuality(lat, lng),
      fetchRoutes(userId),
      fetchAlerts(userId),
      fetchCommuteStats(userId, 7),
    ]);
    // 경로 갱신 후 교통 정보도 갱신
    if (activeRoute) {
      await fetchTransitArrivals(activeRoute);
    }
  } finally {
    setIsRefreshing(false);
  }
};

// ScrollView에 적용
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      tintColor="#3B82F6"       // iOS spinner 색상
      colors={['#3B82F6']}     // Android spinner 색상
    />
  }
>
```

---

## 로딩 상태 (Skeleton UI)

### 초기 로딩

전체 화면 스켈레톤을 표시한다. 개별 카드 형태의 회색 박스 + shimmer 애니메이션.

```
┌──────────────────────────────────────┐
│ ████████████████████  (인사 메시지)   │
│                                      │
│ ┌──────────────────────────────┐     │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │     │  ← 브리핑 카드 스켈레톤
│ │ ░░░░░░░░░░░░░░░░░░░░░       │     │
│ └──────────────────────────────┘     │
│ ┌──────────────────────────────┐     │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │     │  ← 날씨 카드 스켈레톤
│ │ ░░░░░░░░░░░░░░░              │     │
│ │ ░░░░░░░░░░░░░░░░░░░░░       │     │
│ └──────────────────────────────┘     │
│ ┌──────────────────────────────┐     │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │     │  ← 교통 카드 스켈레톤
│ │ ░░░░░░░░░░░░░░░              │     │
│ │ ░░░░░░░░░░░░░░░░░░░░░       │     │
│ │ ░░░░░░░░░░░░░░░░░░░░░       │     │
│ └──────────────────────────────┘     │
└──────────────────────────────────────┘
```

### 부분 로딩

| 데이터 | 로딩 중 표시 | 에러 시 표시 |
|--------|-------------|-------------|
| 날씨 | 날씨 카드 스켈레톤 | "날씨 정보를 불러올 수 없습니다" + 재시도 버튼 |
| 미세먼지 | 미세먼지 뱃지 영역 스켈레톤 | "미세먼지 정보 없음" 텍스트 |
| 경로 | 교통 카드 스켈레톤 | 에러 없이 "경로를 등록해보세요" 카드 표시 |
| 교통 도착 | 각 행에 작은 spinner | "조회 실패" 텍스트 (행별 독립) |
| 알림 | 알림 카드 스켈레톤 | 카드 숨김 |

### Shimmer 애니메이션 구현

```typescript
// RN Animated를 사용한 shimmer 효과
import { Animated } from 'react-native';

function SkeletonBox({ width, height }: { width: number | string; height: number }): JSX.Element {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={[styles.skeletonBox, { width, height }]}>
      <Animated.View
        style={[styles.shimmer, { transform: [{ translateX }] }]}
      />
    </View>
  );
}
```

---

## 에러 상태

### 1. 네트워크 에러 (전체)

인터넷 연결 없거나 서버 다운 시.

```
┌──────────────────────────────────────┐
│                                      │
│        📡                            │
│   네트워크 연결을 확인해주세요          │
│                                      │
│   인터넷 연결 후 다시 시도해주세요.     │
│                                      │
│      [     다시 시도     ]            │
│                                      │
└──────────────────────────────────────┘
```

### 2. 부분 API 실패

날씨만 실패, 교통만 실패 등. 다른 카드는 정상 표시하고, 실패한 카드만 에러 표시.

```
┌──────────────────────────────────────┐
│ [날씨 카드 - 에러]                    │
│ 날씨 정보를 불러올 수 없습니다         │
│ [다시 시도]                           │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ [교통 카드 - 정상]                    │
│ ...정상 데이터 표시...                │
└──────────────────────────────────────┘
```

**원칙**: 하나의 API 실패가 전체 화면을 차단하지 않는다. `Promise.allSettled` 사용.

### 3. 인증 만료 (401)

`apiClient`의 `onUnauthorized` 콜백이 자동으로 로그아웃 처리. 로그인 화면으로 리다이렉트.

### 4. 서버 에러 (5xx)

카드별 에러 메시지 표시. `apiClient`의 자동 재시도 (2회) 후에도 실패하면 사용자에게 표시.

---

## 엣지 케이스

### 1. 경로 미설정

저장된 경로가 없는 신규 사용자.

```
┌──────────────────────────────────────┐
│ [날씨 카드 - 정상 표시]               │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 출근 경로를 등록해보세요               │
│                                      │
│ 경로를 등록하면 실시간 교통 정보와     │
│ 출퇴근 기록이 자동으로 연결됩니다.      │
│                                      │
│  [      경로 등록하기      ]          │
└──────────────────────────────────────┘
```

- 브리핑 카드: 날씨 + 미세먼지만 표시 (교통/소요시간 제외)
- 교통 카드: "경로 등록하기" CTA 카드로 대체
- 다음 알림 카드: 알림이 있으면 정상 표시

### 2. 교통 데이터 없음 (운행 종료)

심야 시간대 또는 API가 빈 배열 반환.

```
지하철  강남역
        운행 정보 없음
```

- `arrivals` 배열이 빈 경우: "운행 정보 없음" 텍스트
- 교통 카드 자체는 유지, 내부 항목만 빈 상태 표시

### 3. 자정 전후 타임존 이슈

`getTimeContext()`와 `getActiveRoute()`가 `new Date().getHours()`를 사용. 한국(UTC+9) 기준 자정 전후 동작:

| 시각 | getTimeContext | getActiveRoute 우선 |
|------|---------------|-------------------|
| 00:00~05:59 | `'tomorrow'` | morning 경로 |
| 06:00~11:59 | `'morning'` | morning 경로 |
| 12:00~13:59 | `'evening'` | evening 경로 |
| 14:00~17:59 | `'evening'` | evening 경로 |
| 18:00~23:59 | `'tomorrow'` | morning 경로 |

- `getActiveRoute`는 시간 기반으로 morning/evening 자동 전환 (14시 기준)
- 사용자가 수동으로 출근/퇴근 전환 가능

### 4. 위치 권한 거부

```typescript
// expo-location 권한 요청 → 거부 시 서울 기본값
const DEFAULT_LOCATION = { latitude: 37.5665, longitude: 126.9780 };
```

- 날씨 카드에 "서울 기준" 뱃지 표시
- 기능 자체는 정상 동작

### 5. 비로그인 상태

로그인하지 않은 사용자가 홈 화면에 진입.

```
┌──────────────────────────────────────┐
│                                      │
│        출퇴근 메이트                   │
│                                      │
│   매일 아침, 날씨와 교통 정보를        │
│   한눈에 확인하세요.                   │
│                                      │
│   [      로그인      ]               │
│   [     회원가입     ]               │
│                                      │
└──────────────────────────────────────┘
```

### 6. 알림 없음

저장된 알림이 없는 경우 → 다음 알림 카드 자체를 숨김. (레이아웃에 영향 없음)

### 7. 통계 데이터 부족

출퇴근 기록이 3회 미만이면 브리핑 카드에서 "약 N분 예상" 부분 생략. 날씨 + 미세먼지만 표시.

---

## Scope (MoSCoW)

### Must Have (이번 사이클 필수)

- [x] 인사 메시지 헤더 (시간대별 + 사용자명)
- [ ] 날씨 카드 (온도, 상태, 미세먼지, 습도, 조언)
- [ ] 실시간 교통 카드 (지하철/버스 도착 정보)
- [ ] 경로 요약 표시 (경로명 + 체크포인트)
- [ ] Pull-to-refresh 동작
- [ ] 30초 교통 정보 자동 갱신
- [ ] 초기 로딩 스켈레톤
- [ ] 에러 상태 처리 (네트워크 에러, API 실패)
- [ ] 경로 미설정 시 등록 유도 CTA
- [ ] 비로그인 시 게스트 뷰
- [ ] TypeScript 에러 0개

### Should Have (중요, 시간 허용 시)

- [ ] 브리핑 카드 (한 줄 요약)
- [ ] 다음 알림 카드
- [ ] 앱 포그라운드 복귀 시 데이터 갱신
- [ ] 갱신 타임스탬프 표시 ("방금 전", "N초 전")
- [ ] 곧 도착 강조 표시 (2분 이내)
- [ ] 위치 권한 거부 시 "서울 기준" 뱃지

### Could Have (보너스)

- [ ] 날씨 조건별 배경 그라데이션 (맑음: 파란색, 비: 회색)
- [ ] 브리핑 카드 시간대별 배경색 변화
- [ ] 카드 진입 애니메이션 (FadeIn + SlideUp)
- [ ] 출퇴근 경로 전환 토글 (자동/출근/퇴근)

### Won't Have (이번 사이클 제외)

- 출발하기 버튼 동작 (출퇴근 세션 시작 — Phase 1 후반 P1-4에서 구현)
- 주간 리포트 카드 (PWA에는 있지만, 모바일 Phase 1 스코프 외)
- 스트릭 뱃지 (Phase 1 스코프 외)
- 날씨 체크리스트 (우산/마스크 체크 — Phase 2에서 고려)
- 최적 출발 시각 추천 (Phase 2 스코프)
- 경로 추천 (Phase 2 스코프)

---

## Acceptance Criteria

### 필수 (Must Have)

- [ ] **AC-1**: Given 로그인된 사용자가 홈 탭에 진입할 때, When 데이터 로딩 중이면, Then 3개의 스켈레톤 카드가 shimmer 애니메이션과 함께 표시된다.

- [ ] **AC-2**: Given 날씨 데이터가 로드되었을 때, When 날씨 카드를 보면, Then 온도(정수, 반올림), 날씨 상태(한글), 미세먼지 등급(좋음/보통/나쁨/매우나쁨), 습도(%)가 모두 표시된다.

- [ ] **AC-3**: Given 미세먼지 PM10이 30 이하일 때, When 미세먼지 뱃지를 보면, Then "좋음"이 초록색 뱃지로 표시된다. PM10 31~80은 "보통"(노란색), 81~150은 "나쁨"(주황색), 151 이상은 "매우나쁨"(빨간색).

- [ ] **AC-4**: Given 저장된 경로가 있고 활성 경로에 지하철 체크포인트가 있을 때, When 교통 카드를 보면, Then 해당 역의 실시간 도착 정보(행선지 + N분)가 표시된다.

- [ ] **AC-5**: Given 저장된 경로가 있고 활성 경로에 버스 체크포인트가 있을 때, When 교통 카드를 보면, Then 해당 정류장의 버스 도착 정보(노선명 + N분 + 남은 정거장)가 표시된다.

- [ ] **AC-6**: Given 교통 카드가 표시된 상태에서, When 30초가 경과하면, Then 교통 도착 정보가 자동으로 갱신되고 타임스탬프가 업데이트된다.

- [ ] **AC-7**: Given 홈 화면에서, When 사용자가 아래로 당기면(Pull-to-refresh), Then 모든 데이터(날씨, 미세먼지, 경로, 교통, 알림)가 갱신되고 spinner가 표시된다.

- [ ] **AC-8**: Given 저장된 경로가 없을 때, When 홈 화면을 보면, Then "출근 경로를 등록해보세요" 메시지와 "경로 등록하기" 버튼이 표시되고, 교통 카드 대신 CTA 카드가 표시된다.

- [ ] **AC-9**: Given 날씨 API 호출이 실패했을 때, When 홈 화면을 보면, Then 날씨 카드에 "날씨 정보를 불러올 수 없습니다" 에러 메시지와 "다시 시도" 버튼이 표시되고, 교통 카드는 정상 표시된다.

- [ ] **AC-10**: Given 비로그인 상태에서, When 홈 탭에 진입하면, Then 게스트 뷰(로그인/회원가입 버튼)가 표시되고 API 호출이 발생하지 않는다.

- [ ] **AC-11**: Given 시간이 06:00~08:59일 때, When 인사 메시지를 보면, Then "좋은 아침이에요"가 표시되고 사용자 이름이 함께 표시된다.

### 중요 (Should Have)

- [ ] **AC-12**: Given 활성 경로 + 날씨 데이터가 있을 때, When 브리핑 카드를 보면, Then "☀️ 7° · 좋음" 형태의 한 줄 요약이 표시된다.

- [ ] **AC-13**: Given 활성화된 알림이 있을 때, When 홈 화면을 보면, Then 다음 알림 카드에 알림 시각과 이름이 표시된다.

- [ ] **AC-14**: Given 교통 도착 시간이 2분 이하일 때, When 교통 카드를 보면, Then 해당 항목이 강조 스타일(번개 아이콘 + 강조 색상)로 표시된다.

- [ ] **AC-15**: Given 앱이 백그라운드에서 포그라운드로 복귀할 때, When 홈 화면이 활성화되면, Then 날씨와 교통 정보가 자동으로 갱신된다.

---

## Task Breakdown

### Phase A: 기반 구조 (hooks + types + utils)

| # | Task | 복잡도 | 의존성 | 예상 시간 |
|---|------|:------:|--------|----------|
| T1 | 타입 정의 파일 생성 (`mobile/src/types/home.ts`) — WeatherData, AirQualityData, RouteResponse, SubwayArrival, BusArrival, Alert, TransitArrivalInfo, CommuteStatsResponse 타입 정의 | S | 없음 | 20분 |
| T2 | 유틸리티 함수 이식 (`mobile/src/utils/weather.ts`) — getGreeting, getAqiStatus, getWeatherAdvice, translateCondition, getTimeContext, getActiveRoute 순수함수 이식 | S | T1 | 30분 |
| T3 | useHomeData 커스텀 훅 생성 (`mobile/src/hooks/useHomeData.ts`) — API 호출 오케스트레이션, 30초 interval, Pull-to-refresh, AppState 포그라운드 감지 | L | T1, T2 | 60분 |

### Phase B: 카드 컴포넌트 구현

| # | Task | 복잡도 | 의존성 | 예상 시간 |
|---|------|:------:|--------|----------|
| T4 | SkeletonBox 공통 컴포넌트 (`mobile/src/components/SkeletonBox.tsx`) — Animated shimmer 효과 | S | 없음 | 20분 |
| T5 | WeatherCard 컴포넌트 (`mobile/src/components/home/WeatherCard.tsx`) — 온도, 날씨 상태, 미세먼지, 습도, 조언 표시 + 스켈레톤 + 에러 상태 | M | T1, T2, T4 | 40분 |
| T6 | TransitCard 컴포넌트 (`mobile/src/components/home/TransitCard.tsx`) — 경로 헤더, 교통 도착 정보, 갱신 타임스탬프, 빈 상태 | M | T1, T4 | 45분 |
| T7 | BriefingCard 컴포넌트 (`mobile/src/components/home/BriefingCard.tsx`) — 한 줄 요약 (main + sub) + 시간대별 스타일 | S | T1, T2 | 25분 |
| T8 | NextAlertCard 컴포넌트 (`mobile/src/components/home/NextAlertCard.tsx`) — 다음 알림 시각 + 이름 | S | T1 | 15분 |
| T9 | EmptyRouteCard 컴포넌트 (`mobile/src/components/home/EmptyRouteCard.tsx`) — 경로 미설정 CTA | S | 없음 | 15분 |
| T10 | GuestView 컴포넌트 (`mobile/src/components/home/GuestView.tsx`) — 비로그인 랜딩 | S | 없음 | 15분 |
| T11 | NetworkErrorView 컴포넌트 (`mobile/src/components/home/NetworkErrorView.tsx`) — 전체 네트워크 에러 | S | 없음 | 10분 |

### Phase C: 화면 조립 + 통합

| # | Task | 복잡도 | 의존성 | 예상 시간 |
|---|------|:------:|--------|----------|
| T12 | HomeScreen 메인 화면 조립 (`mobile/app/(tabs)/index.tsx`) — ScrollView + RefreshControl + 카드 배치 + 조건부 렌더링 + 스켈레톤 | M | T3~T11 | 45분 |
| T13 | 수동 테스트 + 엣지 케이스 검증 — 비로그인, 경로 없음, API 실패, 자정 전후 | M | T12 | 30분 |

### 의존성 그래프

```
T1 (타입) ──→ T2 (유틸) ──→ T3 (훅)
  │                            │
  ├──→ T5 (날씨 카드) ────────┤
  ├──→ T6 (교통 카드) ────────┤
  ├──→ T7 (브리핑 카드) ──────┤
  ├──→ T8 (알림 카드) ────────┤
  │                            │
T4 (스켈레톤) ──→ T5, T6      │
                               │
T9  (빈 경로) ────────────────┤
T10 (게스트뷰) ───────────────┤
T11 (네트워크 에러) ──────────┤
                               ▼
                        T12 (화면 조립)
                               │
                               ▼
                        T13 (테스트)
```

### 총 예상 시간: ~6시간

---

## 파일 구조 (예상)

```
mobile/
  app/(tabs)/
    index.tsx                    ← 홈 화면 (T12에서 교체)
  src/
    types/
      home.ts                    ← 홈 화면 전용 타입 (T1)
    utils/
      weather.ts                 ← 날씨/인사 유틸 (T2)
      route.ts                   ← 경로 유틸 (T2)
      briefing.ts                ← 브리핑 텍스트 빌더 (T2)
    hooks/
      useHomeData.ts             ← 홈 데이터 훅 (T3)
    components/
      SkeletonBox.tsx            ← 공통 스켈레톤 (T4)
      home/
        WeatherCard.tsx          ← 날씨 카드 (T5)
        TransitCard.tsx          ← 교통 카드 (T6)
        BriefingCard.tsx         ← 브리핑 카드 (T7)
        NextAlertCard.tsx        ← 다음 알림 카드 (T8)
        EmptyRouteCard.tsx       ← 경로 미설정 CTA (T9)
        GuestView.tsx            ← 비로그인 랜딩 (T10)
        NetworkErrorView.tsx     ← 네트워크 에러 (T11)
```

---

## Open Questions

1. **위치 권한 요청 시점**: 홈 화면 최초 진입 시 expo-location 권한을 요청할 것인가, 아니면 설정 화면에서 별도로 요청할 것인가?
   - **제안**: 홈 화면 최초 진입 시 요청. 거부해도 서울 기본값으로 동작하므로 UX 차단 없음.

2. **"출발하기" 버튼 동작 범위**: P1-2에서 출퇴근 세션 시작까지 구현할 것인가, UI만 보여줄 것인가?
   - **제안**: P1-2에서는 UI만 표시하고 비활성 상태로 둠. P1-4 (출퇴근 트래킹 화면)에서 연결.

3. **교통 카드 최대 항목 수**: 경로에 지하철 3개 + 버스 2개가 있으면 5개 다 보여줄 것인가?
   - **제안**: PWA와 동일하게 지하철 최대 2개 + 버스 최대 2개 = 최대 4개 항목.

---

## Out of Scope

| 제외 항목 | 사유 |
|----------|------|
| 출퇴근 세션 시작/기록 | P1-4 (출퇴근 트래킹 화면) 스코프 |
| 주간 리포트 카드 | Phase 1 핵심 기능 아님. PWA에만 유지 |
| 스트릭/마일스톤 뱃지 | Phase 1 핵심 기능 아님 |
| 날씨 체크리스트 (준비물 체크) | Phase 2에서 네이티브 위젯과 연동하여 구현 |
| 최적 출발 시각 추천 | Phase 2 (스마트 출발) 스코프 |
| 경로 추천 (날씨 기반) | Phase 2 스코프. 경로 2개 이상 + 충분한 데이터 필요 |
| 출퇴근 경로 전환 토글 UI | Could Have. 시간 허용 시 추가 |
| 신규 백엔드 API 개발 | 기존 API 100% 재사용 |

---

*이 스펙은 기존 PWA (`frontend/src/presentation/pages/home/`) 구현을 참조하여 작성됨.*
*전역 컨벤션: `~/.claude/CLAUDE.md` | 프로젝트 컨텍스트: `CLAUDE.md` | PRD: `docs/PRD.md`*
