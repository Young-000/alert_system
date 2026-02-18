# P2-3: 상황 인식 브리핑

## JTBD

When 아침에 출근 준비를 하면서 여러 앱을 확인할 시간이 없을 때,
I want to 날씨/미세먼지/교통 상황을 종합한 실생활 조언을 한 눈에 보고 싶다,
so I can 우산/마스크/겉옷 등 준비물을 빠뜨리지 않고 최적의 타이밍에 출발할 수 있다.

## Problem

- **Who:** 매일 대중교통으로 출퇴근하는 수도권 직장인 (핵심 타겟)
- **Pain:** 매일 반복 (빈도: 일 2회) x 중간 심각도 (우산 안 챙기면 비 맞음, 마스크 안 쓰면 건강 영향)
- **Current workaround:** 날씨 앱 + 미세먼지 앱 + 카카오맵을 각각 열어서 직접 판단. 또는 감에 의존.
- **Success metric:**
  - 홈 화면 브리핑 카드 노출률 > 90% (경로 설정 완료 사용자 대상)
  - 브리핑 카드 → 준비물 조언 적중률 체감 만족도 (추후 설문)
  - 기존 `buildBriefing()` 대비 정보 밀도 2배 (현재: 온도+미세먼지 수준 → 개선: 옷차림+우산+마스크+교통 조언)

## Solution

### Overview

기존 시스템에는 날씨/미세먼지/교통 데이터를 이미 수집하고 있으나, 이를 "상황 인식 조언"으로 가공하는 계층이 부족하다. 현재 `buildBriefing()`은 단순히 `"☀️ 7° · 좋음 · 약 29분 예상"` 수준의 데이터 나열이고, `NotificationMessageBuilderService.generateTip()`에 일부 조언 로직이 있지만 알림 전용이며 범위가 제한적이다.

이 feature는 **Backend에 Advice Engine 서비스를 추가**하고, **기존 widget/data API를 확장**하여 브리핑 조언을 응답에 포함시키며, **Mobile의 BriefingCard를 리디자인**하여 조언 텍스트를 시각적으로 보여주는 것이 핵심이다.

**설계 원칙: 기존 서비스 최대 재사용.** 새로운 외부 API 호출 없이, 이미 `WidgetDataService`가 수집하는 weather/airQuality/transit 데이터를 조언 텍스트로 변환하는 순수 로직 레이어만 추가한다.

### User Flow

1. 사용자가 아침에 앱을 열면 홈 화면(`/(tabs)/index.tsx`)이 로드됨
2. `useHomeData` 훅이 날씨/미세먼지/교통 데이터를 fetch (기존 플로우)
3. **NEW:** fetch된 데이터를 `buildContextBriefing()` 유틸에 전달하여 조언 목록 생성
4. **ENHANCED:** `BriefingCard`가 기존 한 줄 요약 대신 조언 칩(chip) 리스트로 렌더링
5. 사용자가 한 눈에 "코트 입으세요 / 우산 필수 / 마스크 착용 / 2호선 정상 운행" 확인
6. 위젯에도 최우선 조언 1줄이 표시됨

```
[앱 열기] → [기존 데이터 fetch] → [Advice Engine 적용] → [BriefingCard 렌더링]
                                        ↓
                                  [위젯 데이터에도 포함]
```

### Scope (MoSCoW)

**Must have:**
- Backend: `BriefingAdviceService` — 날씨/미세먼지/교통 데이터를 조언 문자열로 변환하는 순수 서비스
- Backend: `GET /briefing` API 엔드포인트 (기존 widget/data와 병렬, 또는 widget/data 응답 확장)
- 기온 범위별 옷차림 조언 (한국어)
- 강수 확률/상태별 우산 조언
- 미세먼지 등급별 마스크 조언
- 교통 지연 알림 (지하철/버스 도착 정보 기반)
- 시간대별 모드 (출근/퇴근)
- Mobile: 리디자인된 `BriefingCard` (조언 칩 리스트)

**Should have:**
- 위젯 데이터에 최우선 조언 1줄 포함 (`widgetBriefingText`)
- 일교차 경고 ("겉옷 챙기세요")
- 체감온도 기반 조언 (바람 세기 반영)
- 풍속 경고 ("강풍 주의")

**Could have:**
- 조언 아이콘 + 색상 코딩 (severity: info/warning/danger)
- 사용자 선호 설정 (민감 체질 토글 → 마스크 기준 강화)
- 조언 히스토리 캐싱 (같은 날 같은 조건 → 재계산 방지)

**Won't have (this cycle):**
- AI/ML 기반 개인화 조언 (Phase 3 범위)
- 대안 경로 제시 ("2호선 지연 → 9호선 환승") — P3-5 별도 항목
- 날씨 예보 기반 미래 조언 ("내일은 비 예보")
- 카카오톡 알림톡에 브리핑 포함 (기존 Solapi 템플릿 변경 필요)

---

## Technical Design

### 1. Backend: BriefingAdviceService

**위치:** `backend/src/application/services/briefing-advice.service.ts`

이 서비스는 순수 함수 기반으로 설계한다. 외부 API를 호출하지 않으며, 이미 fetch된 데이터를 입력받아 조언 목록을 반환한다.

```typescript
// ─── Input ───
type BriefingInput = {
  weather: WidgetWeatherDto | null;
  airQuality: WidgetAirQualityDto | null;
  transit: WidgetTransitDto;
  departure: WidgetDepartureDataDto | null;
  timeContext: 'morning' | 'evening';
};

// ─── Output ───
type AdviceSeverity = 'info' | 'warning' | 'danger';
type AdviceCategory = 'clothing' | 'umbrella' | 'mask' | 'transit' | 'temperature' | 'wind';

type BriefingAdvice = {
  category: AdviceCategory;
  severity: AdviceSeverity;
  icon: string;        // emoji
  message: string;     // 한국어 조언 (15자 이내 권장)
  detail?: string;     // 부가 설명 (선택)
};

type BriefingResponse = {
  contextLabel: string;         // "출근 브리핑" | "퇴근 브리핑"
  summary: string;              // 한 줄 요약 (위젯용, 20자 이내)
  advices: BriefingAdvice[];    // 최대 4개, severity 순 정렬
  weather: WidgetWeatherDto | null;
  airQuality: WidgetAirQualityDto | null;
  transit: WidgetTransitDto;
  updatedAt: string;
};
```

### 2. Advice Engine: 조언 생성 규칙

모든 규칙은 한국어로 작성하며, 겨울/여름 한국 기후 기준이다.

#### 2-1. 기온별 옷차림 조언

| 기온 범위 (체감온도 우선, 없으면 기온) | icon | message | severity |
|------|------|---------|----------|
| <= -10 | `🥶` | 패딩 필수, 방한용품 챙기세요 | danger |
| -10 ~ 0 | `🧥` | 두꺼운 외투 필수 | warning |
| 0 ~ 5 | `🧥` | 코트나 두꺼운 겉옷 | warning |
| 5 ~ 10 | `🧶` | 자켓 + 니트 추천 | info |
| 10 ~ 15 | `👔` | 가벼운 겉옷 | info |
| 15 ~ 20 | `👕` | 긴팔 또는 얇은 겉옷 | info |
| 20 ~ 25 | `👕` | 반팔 가능, 실내 냉방 주의 | info |
| 25 ~ 28 | `☀️` | 반팔, 수분 섭취 | info |
| 28 ~ 33 | `🥵` | 더위 주의, 수분 섭취 필수 | warning |
| >= 33 | `🔥` | 폭염 경보, 외출 자제 | danger |

**특수 규칙:**
- 일교차 >= 10도: 추가 조언 "일교차 {N}도, 겉옷 챙기세요" (category: `clothing`, severity: `warning`)
- 체감온도와 실제 기온 차이 >= 5도: "바람이 강해 체감 {N}도" (category: `wind`, severity: `warning`)

#### 2-2. 강수/날씨 조언

| 조건 | icon | message | severity |
|------|------|---------|----------|
| 비 예보 (forecast에 rain 포함 or condition에 rain/drizzle) | `🌂` | 우산 챙기세요 | warning |
| 강수확률 >= 60% (hourlyForecasts) | `🌂` | 우산 필수 (강수확률 {N}%) | warning |
| 강수확률 >= 40% && < 60% | `🌂` | 우산 챙기면 좋겠어요 | info |
| 눈 예보 (condition에 snow) | `❄️` | 눈 예보, 미끄럼 주의 | warning |
| 뇌우 (condition에 thunder) | `⛈️` | 뇌우 예보, 외출 주의 | danger |
| 안개/연무 (condition에 mist/fog/haze) | `🌫️` | 시야 주의, 안전 운전 | info |

**강수확률 판정 로직:**
- `weather.forecast.hourlyForecasts` 중 `timeContext === 'morning'`이면 오전/오후 슬롯, `'evening'`이면 오후/저녁 슬롯의 최대 `rainProbability`를 사용
- 기존 `NotificationMessageBuilderService.extractTimeSlotsWithRain()` 로직 재사용

#### 2-3. 미세먼지 조언

| PM10 수준 (statusLevel) | icon | message | severity |
|------|------|---------|----------|
| `good` (PM10 <= 30) | `😊` | 공기 좋음, 산책하기 좋아요 | info |
| `moderate` (PM10 31-80) | `😐` | 미세먼지 보통 | info |
| `unhealthy` (PM10 81-150) | `😷` | 마스크 착용 권장 | warning |
| `veryUnhealthy` (PM10 > 150) | `🤢` | 마스크 필수, 실외활동 자제 | danger |

**PM2.5 보정:** PM2.5 > 35이면 statusLevel을 한 단계 올림 (moderate -> unhealthy).

#### 2-4. 교통 조언

| 조건 | icon | message | severity |
|------|------|---------|----------|
| 지하철 도착 <= 3분 | `🚇` | {역이름} 곧 도착, 서두르세요 | warning |
| 지하철 도착 > 3분 | `🚇` | {역이름} {N}분 후 도착 | info |
| 버스 도착 <= 3분 | `🚌` | {노선}번 곧 도착 | warning |
| 버스 도착 > 3분 | `🚌` | {노선}번 {N}분 후 ({정류장수}정거장) | info |
| 지하철 + 버스 모두 있을 때 | `🚦` | 빠른 쪽 우선 표시 | info |
| transit 데이터 없음 | - | 교통 조언 생략 | - |

**스마트 출발 연동:** `departure` 데이터가 있을 때:
- `minutesUntilDeparture <= 10`: "출발까지 {N}분!" (severity: `warning`)
- `hasTrafficDelay === true`: "교통 지연 감지, 여유 있게 출발하세요" (severity: `warning`)

#### 2-5. 조언 우선순위 및 제한

- 최대 **4개** 조언만 반환 (화면 공간 제약)
- 정렬 순서: `danger` > `warning` > `info`
- 같은 severity 내에서는 category 순서: `umbrella` > `mask` > `clothing` > `transit` > `temperature` > `wind`
- `summary` (위젯용 한 줄): 가장 높은 severity 조언의 message 사용

### 3. Backend API Endpoint

기존 `WidgetDataService.getData()` 응답을 확장하는 방식이 가장 효율적이다. 별도 endpoint를 추가하면 같은 데이터를 2번 fetch하게 되므로 낭비다.

**선택: 기존 `/widget/data` 응답에 `briefing` 필드 추가**

```typescript
// widget-data.dto.ts 확장
export class WidgetDataResponseDto {
  weather: WidgetWeatherDto | null;
  airQuality: WidgetAirQualityDto | null;
  nextAlert: WidgetNextAlertDto | null;
  transit: WidgetTransitDto;
  departure: WidgetDepartureDataDto | null;
  briefing: BriefingResponseDto | null;  // NEW
  updatedAt: string;
}
```

동시에, Mobile 앱에서는 `/widget/data` 호출 없이 로컬 데이터로 브리핑을 생성할 수도 있다. 두 경로 모두 지원:

**경로 A (Mobile 앱):** `useHomeData`가 이미 fetch한 weather/airQuality/transit 데이터를 `buildContextBriefing()` 유틸에 전달하여 클라이언트 사이드에서 조언 생성. 네트워크 추가 호출 없음.

**경로 B (Widget):** `/widget/data` 응답의 `briefing` 필드를 사용. 위젯은 자체적으로 조언 로직을 돌릴 수 없으므로 서버에서 생성.

**조언 로직은 공유 가능하도록 순수 함수로 작성.** Backend `BriefingAdviceService`의 로직을 Mobile의 `utils/briefing.ts`에도 동일하게 구현한다 (TypeScript이므로 로직 복사 가능).

### 4. Mobile UI: 리디자인된 BriefingCard

**현재 BriefingCard:**
```
┌─────────────────────────────┐
│  출근 브리핑                 │  ← contextLabel
│  ☀️ 7° · 좋음 · 약 29분 예상 │  ← main (데이터 나열)
│  강남역 3분 후 도착           │  ← sub
└─────────────────────────────┘
```

**리디자인된 BriefingCard:**
```
┌─────────────────────────────────────┐
│  출근 브리핑                         │
│                                     │
│  🧥 코트 챙기세요   🌂 우산 필수      │  ← 조언 칩 (최대 4개, 2열)
│  😷 마스크 착용      🚇 강남역 3분    │
│                                     │
│  3°C 흐림 · 미세먼지 나쁨             │  ← 데이터 요약 (sub line)
└─────────────────────────────────────┘
```

**컴포넌트 구조:**

```
BriefingCard (container)
├── contextLabel ("출근 브리핑")
├── AdviceChipGrid (2x2 그리드)
│   ├── AdviceChip (icon + message, severity별 배경색)
│   ├── AdviceChip
│   ├── AdviceChip
│   └── AdviceChip
└── summaryLine (기온 + 날씨 + 미세먼지 한 줄)
```

**AdviceChip 색상:**
- `info`: `colors.gray100` 배경, `colors.gray700` 텍스트
- `warning`: `#FEF3C7` (amber-100) 배경, `#92400E` (amber-800) 텍스트
- `danger`: `#FEE2E2` (red-100) 배경, `#991B1B` (red-800) 텍스트

**조언이 0개일 때 (데이터 부족):**
기존 BriefingCard 형태로 fallback (main + sub 한 줄씩).

### 5. Widget Integration

`WidgetDataResponseDto`에 `briefing` 필드를 추가하면, 기존 위젯 싱크 로직 (`widgetSyncService`)이 이를 자동으로 iOS/Android 위젯에 전달한다.

위젯에서 표시할 데이터:
- `briefing.summary`: 한 줄 조언 텍스트 (20자 이내)
- 기존 날씨/교통 정보는 그대로 유지

Widget 레이아웃 변경은 최소화:
```
┌──── Medium (4×2) ────────────────────────┐
│  7°C ☀️ 맑음   미세먼지 좋음              │
│  🧥 코트 챙기세요 · 🌂 우산 필수           │  ← NEW: 조언 1줄
│  🚇 강남역 → 홍대입구 29분                │
│  다음 알림 07:00                          │
└──────────────────────────────────────────┘
```

### 6. DB Schema

**새로운 테이블 불필요.** 조언은 실시간 데이터 기반으로 매번 생성되며, 캐싱은 기존 `ApiCacheService` (in-memory 또는 Redis)를 통해 자연스럽게 처리된다 (날씨/미세먼지 API 응답 자체가 캐싱됨).

사용자 선호 설정 (Could have: 민감 체질 토글)은 이 사이클에서 구현하지 않으므로 DB 변경 없음.

---

## Acceptance Criteria

### Must Have

- [ ] **AC-1:** Given 기온이 3도이고 미세먼지 PM10이 100인 날씨 데이터가 있을 때, When 홈 화면 BriefingCard를 볼 때, Then "코트" 관련 옷차림 조언과 "마스크 착용" 조언이 표시된다.
- [ ] **AC-2:** Given 강수확률 70% 비 예보가 있을 때, When 브리핑을 생성할 때, Then "우산 필수" 조언이 severity `warning`으로 포함된다.
- [ ] **AC-3:** Given 미세먼지 PM10 > 150 (매우 나쁨)일 때, When 브리핑을 생성할 때, Then "마스크 필수, 실외활동 자제" 조언이 severity `danger`로 포함된다.
- [ ] **AC-4:** Given 조언이 5개 이상 생성 가능한 상황일 때, When 브리핑을 렌더링할 때, Then 최대 4개만 severity 순으로 표시된다.
- [ ] **AC-5:** Given 오전 7시에 앱을 열었을 때, When BriefingCard가 표시될 때, Then contextLabel이 "출근 브리핑"이다.
- [ ] **AC-6:** Given 오후 6시에 앱을 열었을 때, When BriefingCard가 표시될 때, Then contextLabel이 "퇴근 브리핑"이다.
- [ ] **AC-7:** Given 날씨/미세먼지 데이터가 모두 없을 때, When 홈 화면을 볼 때, Then BriefingCard가 표시되지 않거나 기존 fallback UI로 표시된다.
- [ ] **AC-8:** Given `/widget/data` API를 호출할 때, When 응답을 받으면, Then `briefing` 필드에 `summary`와 `advices` 배열이 포함된다.
- [ ] **AC-9:** Given BriefingCard의 AdviceChip이 severity `danger`일 때, When 렌더링될 때, Then 빨간 계열 배경색으로 시각적으로 구분된다.
- [ ] **AC-10:** Given TypeScript 빌드를 실행할 때, When 전체 프로젝트를 컴파일할 때, Then 에러 0개로 통과한다.

### Should Have

- [ ] **AC-11:** Given 위젯이 업데이트될 때, When 브리핑 데이터가 있으면, Then 위젯에 최우선 조언 1줄이 표시된다.
- [ ] **AC-12:** Given 일교차가 12도일 때, When 브리핑을 생성할 때, Then "일교차 12도, 겉옷 챙기세요" 조언이 추가된다.
- [ ] **AC-13:** Given 바람이 10m/s 이상일 때, When 체감온도가 실제 기온보다 5도 이상 낮을 때, Then 풍속 관련 조언이 추가된다.

---

## Task Breakdown

### Backend Tasks (BE)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| BE-1 | `BriefingAdviceDto` 타입 정의 | S | none | `BriefingAdvice`, `BriefingResponse` DTO 클래스를 `application/dto/briefing.dto.ts`에 작성 |
| BE-2 | `BriefingAdviceService` 조언 엔진 구현 | M | BE-1 | 기온/강수/미세먼지/교통 조언 생성 로직. 순수 함수 기반. `application/services/briefing-advice.service.ts` |
| BE-3 | `BriefingAdviceService` 유닛 테스트 | M | BE-2 | 모든 기온 범위, 강수 조건, 미세먼지 등급, 교통 상황에 대한 테스트 케이스 (최소 15개) |
| BE-4 | `WidgetDataService` 확장 — briefing 필드 추가 | S | BE-2 | `getData()` 응답에 `briefing` 필드 추가. `BriefingAdviceService.generate()` 호출 |
| BE-5 | `WidgetDataResponseDto` 확장 | S | BE-1 | 기존 DTO에 `briefing: BriefingResponseDto | null` 추가 |
| BE-6 | 기존 테스트 수정 | S | BE-4, BE-5 | `WidgetDataService` 기존 테스트에 briefing 필드 반영 |

### Mobile Tasks (FE)

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| FE-1 | `BriefingAdvice` 타입 정의 | S | none | `mobile/src/types/home.ts`에 조언 관련 타입 추가 |
| FE-2 | `buildContextBriefing()` 유틸 구현 | M | FE-1 | `mobile/src/utils/briefing.ts` 확장. BE의 조언 로직을 클라이언트 사이드에 구현 |
| FE-3 | `buildContextBriefing()` 유닛 테스트 | M | FE-2 | 기온/강수/미세먼지/교통 조언 생성 테스트 (최소 10개) |
| FE-4 | `AdviceChip` 컴포넌트 구현 | S | FE-1 | severity별 색상 배경, 아이콘+메시지 표시. `mobile/src/components/home/AdviceChip.tsx` |
| FE-5 | `BriefingCard` 리디자인 | M | FE-2, FE-4 | 기존 BriefingCard를 조언 칩 그리드 레이아웃으로 변경. 0개 조언 시 fallback |
| FE-6 | `useHomeData` 훅에 briefing 연동 | S | FE-2 | 기존 데이터로 `buildContextBriefing()` 호출, 결과를 반환값에 추가 |
| FE-7 | Widget 싱크 데이터에 briefing 포함 | S | BE-4 | `widgetSyncService`에서 briefing.summary를 위젯 데이터에 포함 |
| FE-8 | 위젯 UI에 조언 1줄 표시 | S | FE-7 | iOS/Android 위젯 레이아웃에 briefing summary 행 추가 |

### 의존성 그래프

```
BE-1 ─┬─→ BE-2 ─→ BE-3
      │         ↘
      └─→ BE-5 ─→ BE-4 ─→ BE-6
                       ↘
                        FE-7 ─→ FE-8

FE-1 ─→ FE-2 ─→ FE-3
    ↘         ↘
     FE-4 ─→ FE-5
              ↑
              FE-6
```

**병렬 진행 가능:**
- BE-1~BE-3과 FE-1~FE-4는 독립적으로 병렬 진행 가능
- BE-4 완료 후 FE-7 → FE-8 진행
- FE-2, FE-4 완료 후 FE-5 → FE-6 진행

**예상 총 소요:** BE 3~4시간, FE 4~5시간 (1인 기준 1일)

---

## Existing Code Reuse Map

| 재사용 대상 | 위치 | 활용 방식 |
|------------|------|----------|
| `WidgetDataService.getData()` | `backend/src/application/services/widget-data.service.ts` | 브리핑 생성의 데이터 소스. 내부에서 `BriefingAdviceService` 호출 |
| `WidgetDataService.mapWeatherToDto()` | 같은 파일 | 날씨 데이터 매핑 로직 그대로 사용 |
| `WidgetDataService.computeAqiStatusLevel()` | 같은 파일 | PM10 등급 판정 로직 재사용 |
| `NotificationMessageBuilderService.extractTimeSlotsWithRain()` | `backend/src/application/services/notification-message-builder.service.ts` | 시간대별 강수확률 추출 로직 재사용 |
| `NotificationMessageBuilderService.isRainyCondition()` | 같은 파일 | 비 조건 판별 로직 재사용 |
| `NotificationMessageBuilderService.buildWeatherHighlights()` | 같은 파일 | 날씨 하이라이트 로직 참고 (유사 패턴) |
| `buildBriefing()` | `mobile/src/utils/briefing.ts` | 기존 유틸을 확장하여 `buildContextBriefing()` 추가 |
| `BriefingCard` | `mobile/src/components/home/BriefingCard.tsx` | 기존 컴포넌트를 리디자인 (교체) |
| `getTimeContext()` | `mobile/src/utils/route.ts` | 시간대 판별 (`morning`/`evening`/`tomorrow`) 그대로 사용 |
| `Weather.conditionToKorean()` | `backend/src/domain/entities/weather.entity.ts` | 날씨 조건 한국어 변환 |
| `getAqiStatus()` | `mobile/src/utils/weather.ts` | AQI 상태 판정 |
| `WidgetWeatherDto`, `WidgetAirQualityDto` 등 | `backend/src/application/dto/widget-data.dto.ts` | 기존 DTO 타입 그대로 사용 |

---

## Open Questions

1. **조언 로직 Single Source of Truth:** BE와 FE 양쪽에 조언 로직을 구현하면 동기화 문제가 발생할 수 있다. 초기에는 FE만 클라이언트 사이드 로직으로 구현하고, BE는 위젯 전용으로만 사용하는 것이 맞는지?
   - **제안:** FE 우선 구현. BE는 위젯 응답에만 포함. 로직이 안정화되면 BE를 canonical source로 전환.

2. **위젯 레이아웃 변경 범위:** iOS WidgetKit / Android Glance 위젯에 조언 줄을 추가하면 기존 레이아웃이 깨질 수 있다. Small 위젯은 공간이 부족하므로 Medium 이상에서만 표시할지?
   - **제안:** Medium 이상에서만 briefing summary 표시. Small은 기존 유지.

3. **퇴근 모드 범위:** P2-4가 "퇴근 모드"인데, P2-3에서 퇴근 브리핑까지 포함하면 범위가 겹친다. P2-3에서는 contextLabel만 바꾸고 조언 내용은 동일하게 할지, 퇴근 전용 조언을 추가할지?
   - **제안:** P2-3에서는 contextLabel만 변경 ("출근 브리핑" vs "퇴근 브리핑"). 퇴근 전용 조언 (귀가 시간 예측 등)은 P2-4로 이관.

## Out of Scope

- **AI 기반 개인화 조언** — Phase 3 (P3-1 패턴 분석 ML)에서 다룸
- **대안 경로 제시** — P3-5 별도 항목
- **알림톡(Solapi) 템플릿 변경** — 기존 템플릿은 유지, 브리핑은 앱/위젯 전용
- **사용자 선호 설정 UI** — Could have로 분류, 이 사이클 범위 초과
- **날씨 예보 기반 미래 조언** — "내일은 비 올 수 있어요" 등은 추후 고도화
- **Playwright E2E 테스트** — 유닛 테스트로 충분, E2E는 Phase 완료 후 일괄 추가

---

*Spec by PM Agent | Cycle 34 | 2026-02-19*
