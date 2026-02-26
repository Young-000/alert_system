# P2-3: 상황 인식 브리핑 (Context-Aware Briefing)

> PWA 홈 화면에 날씨/미세먼지/교통 상황 기반의 실용적 조언 칩(chip)을 표시하여, 사용자가 출근 준비 시 여러 앱을 확인할 필요 없이 한눈에 필요한 준비물과 행동을 파악할 수 있게 한다.

---

## Executive Summary

매일 출퇴근하는 사용자는 날씨 앱, 미세먼지 앱, 교통 앱을 각각 확인하여 우산/마스크/겉옷 등을 판단한다. 이 과정은 하루 2회(출근/퇴근) 반복되며, 판단 실수 시 비를 맞거나 추위에 노출되는 실질적 불편이 발생한다.

**이미 Backend에 `BriefingAdviceService`가 완성되어 있으며 `/widget/data` 응답에 briefing 필드가 포함된다.** 그러나 PWA 프론트엔드에는 이 데이터를 활용하는 UI가 전혀 없다. 이 스펙은 **기존 Backend 서비스를 PWA에서 활용하는 프론트엔드 작업에 집중**한다.

**Why now:** Backend 인프라(BriefingAdviceService, briefing DTO)가 이미 구현 완료. 프론트엔드만 추가하면 즉시 사용자 가치를 제공할 수 있다. 기존 `getWeatherAdvice()` 함수는 한 줄짜리 문자열만 반환하여 정보 밀도가 낮다.

**Expected impact:** 홈 화면의 정보 밀도 2배 향상 (현재: 단일 텍스트 조언 -> 개선: 최대 4개 조언 칩).

---

## Discovery Context

### Opportunity Solution Tree

```
Desired Outcome: 사용자가 출근 준비 시간을 30초 단축
  -> Opportunity A: 흩어진 날씨/미세먼지/교통 정보를 한 화면에 통합
      -> Solution A1: 조언 칩 그리드 (이 스펙) -- 선택
      -> Solution A2: 음성 브리핑 (TTS)
  -> Opportunity B: 준비물 체크 실수 방지
      -> Solution B1: 체크리스트 (이미 구현됨 - 날씨 체크리스트)
      -> Solution B2: 상황 인식 조언 (이 스펙과 보완적)
```

### Impact Map

```
Goal: 출근 준비 시 앱 사용 시간 30% 감소 (현재 추정 90초 -> 63초)
  -> Actor: 수도권 대중교통 출퇴근 직장인
      -> Impact: 여러 앱을 열지 않고 한 화면에서 판단 완료
          -> Deliverable: 홈 화면 조언 칩 컴포넌트
          -> Deliverable: 조언 생성 순수 함수 (클라이언트 사이드)
```

### JTBD

```
When 아침에 출근 준비를 하면서 여러 앱을 확인할 시간이 없을 때,
I want to 날씨/미세먼지/교통 상황을 종합한 실생활 조언을 한 눈에 보고 싶다,
so I can 우산/마스크/겉옷 등 준비물을 빠뜨리지 않고 바로 출발할 수 있다.
```

**Forces of Progress:**
- Push (pain): 매일 2~3개 앱을 열어 직접 판단 -> 시간 소모 + 빠뜨림 리스크
- Pull (attraction): 한 화면에서 "코트 입으세요", "우산 필수" 같은 명확한 조언
- Anxiety (risk): 조언이 부정확하면 신뢰도 하락 -> 규칙 엔진 투명성으로 해소
- Inertia (habit): 기존 날씨 앱 습관 -> 이미 홈 화면에 날씨 카드가 있으므로 전환 비용 없음

---

## Problem

- **Who:** 매일 대중교통으로 출퇴근하는 수도권 직장인 (핵심 타겟)
- **Pain:** 매일 반복 (빈도: 일 2회) x 중간 심각도 (우산 안 챙기면 비 맞음, 마스크 안 쓰면 건강 영향)
- **Current workaround:** 날씨 앱 + 미세먼지 앱 + 카카오맵을 각각 열어서 직접 판단하거나, 감에 의존
- **현재 PWA 상태:**
  - `WeatherHeroSection`에 온도/조건/습도/미세먼지가 표시됨
  - `getWeatherAdvice()` 함수가 한 줄짜리 단순 문자열만 반환 ("우산을 챙기세요", "쾌적한 날씨에요" 등)
  - `getWeatherChecklist()` 함수가 준비물 칩을 표시하지만, 날씨 상세 펼침(collapsible) 내부에 숨겨져 있어 접근성이 낮음
  - 미세먼지 등급별 조언, 기온 범위별 옷차림 조언, 교통 상황 조언이 없음
- **Why now:** Backend `BriefingAdviceService`가 이미 구현 완료. 프론트엔드만 추가하면 됨.

---

## Solution

### Overview

**핵심 아이디어:** Backend의 `BriefingAdviceService` 로직을 프론트엔드 순수 함수로 포팅하여, 이미 `useHomeData`가 fetch한 날씨/미세먼지 데이터를 조언 칩으로 변환한다. 추가 API 호출 없음.

**왜 클라이언트 사이드인가:**
1. PWA 홈 화면은 이미 `/weather/current`와 `/air-quality/location`을 개별 호출하여 데이터를 보유
2. 조언 로직은 순수 함수이므로 네트워크 없이 즉시 계산 가능
3. `/widget/data` 엔드포인트를 사용하려면 인증이 필요하고 중복 API 호출이 발생
4. Backend `BriefingAdviceService`는 위젯 전용으로 유지하고, PWA는 동일 규칙의 클라이언트 사이드 구현 사용

**기존 코드와의 관계:**
- `getWeatherAdvice()` -> 대체됨 (조언 칩이 더 풍부한 정보 제공)
- `getWeatherChecklist()` -> 보완적 관계 유지 (체크리스트는 "챙겼는지 확인", 조언 칩은 "무엇을 해야 하는지")
- `MorningBriefing` -> 조언 칩과 독립적으로 유지 (경로 설정 사용자 전용)

### User Flow

```
1. 사용자가 홈 화면을 연다
2. useHomeData 훅이 날씨(weather) + 미세먼지(airQuality) 데이터를 React Query로 fetch
3. 데이터가 도착하면 buildAdviceChips() 순수 함수가 조언 목록 생성
4. WeatherHeroSection 하단에 조언 칩 그리드가 항상 표시됨 (collapsible 외부)
5. 사용자가 한 눈에 "코트 입으세요 / 우산 필수 / 마스크 착용" 확인
```

### Scope (MoSCoW)

**Must have (60% effort):**
- FE: `buildAdviceChips()` 순수 함수 — 날씨/미세먼지 데이터로 조언 목록 생성 (BE `BriefingAdviceService` 로직 포팅)
- FE: `AdviceChip` 컴포넌트 — severity별 색상, 아이콘+메시지 표시
- FE: `AdviceChipGrid` 컴포넌트 — 최대 4개 칩을 2열 그리드로 표시
- FE: HomePage 통합 — WeatherHeroSection 하단에 조언 칩 표시
- FE: 조언 규칙 — 기온 범위별 옷차림, 강수 상태별 우산, 미세먼지 등급별 마스크
- FE: 접근성 — 색상만으로 정보 전달하지 않음, aria-label 제공
- FE: 유닛 테스트 — 조언 생성 함수 10+ 케이스
- FE: 컴포넌트 테스트 — AdviceChip/AdviceChipGrid 렌더링 검증

**Should have:**
- FE: 일교차 경고 ("일교차 N도, 겉옷 챙기세요")
- FE: 체감온도 기반 조언 (바람 세기 반영, feelsLike 값 활용)
- FE: 풍속 경고 ("바람이 강해 체감 N도")
- FE: 강수확률 기반 조언 (hourlyForecasts에서 최대 rainProbability 사용)

**Could have:**
- FE: 출근/퇴근 시간대별 조언 모드 전환
- FE: 조언 칩 탭 시 상세 설명 tooltip
- FE: 교통 상황 조언 (transit 데이터 기반, `transitInfos`에서 파생)

**Won't have (this cycle):**
- BE: 새로운 API 엔드포인트 추가 (기존 `/widget/data`는 위젯 전용 유지)
- FE: 사용자 선호 설정 (민감 체질 토글)
- FE: AI/ML 기반 개인화 조언
- FE: 대안 경로 제시 (P3-5)

---

## Riskiest Assumptions

| # | Category | Assumption | Risk | Test Method |
|---|----------|-----------|------|-------------|
| 1 | Desirability | 사용자가 기존 단일 텍스트 조언 대신 다중 칩을 선호한다 | Medium | A/B 비교 (조언 칩 vs 기존 텍스트) - 칩 클릭/스크롤 이벤트 측정 |
| 2 | Usability | 375px 모바일에서 4개 칩이 읽기 편하다 | Low | 실제 디바이스 테스트, 칩 텍스트 15자 제한으로 해소 |
| 3 | Feasibility | 기존 WeatherData 타입으로 모든 조언 규칙을 커버할 수 있다 | Low | 코드베이스 분석 완료 - temperature, condition, humidity, feelsLike, forecast 모두 존재 |
| 4 | Viability | 조언 칩이 기존 날씨 카드와 정보 중복으로 혼란을 줄 수 있다 | Medium | 조언 칩은 "행동 지침" (코트 입으세요), 날씨 카드는 "사실 정보" (3도 흐림)로 역할 분리 |

---

## Success Metrics

### OKR

**Objective:** 홈 화면에서 출근 준비에 필요한 정보를 한 눈에 파악할 수 있다

| Key Result | Target | Baseline |
|-----------|--------|----------|
| 조언 칩 노출률 (날씨 데이터 있는 홈 방문 중) | >= 95% | 0% (미구현) |
| WeatherHeroSection 확장(펼침) 비율 감소 | -20% | 현재 측정 필요 |

### North Star Connection

"By building 상황 인식 브리핑 칩, we expect 홈 화면 체류 시간이 10% 감소(정보 즉시 파악)하면서 날씨 관련 정보 만족도가 향상될 것이다. Because 사용자가 날씨 카드를 펼치지 않아도 핵심 조언을 바로 볼 수 있기 때문이다."

### Metrics Table

| Type | Metric | Target |
|------|--------|--------|
| **Primary** | 조언 칩 노출 세션 비율 | >= 95% |
| **Leading** | 날씨 카드 펼침(expand) 비율 변화 | 측정 |
| **Guardrail** | 홈 화면 로드 시간 | 변화 없음 (조언은 클라이언트 계산, API 추가 호출 0) |
| **Guardrail** | 기존 테스트 통과율 | 100% (기존 394 FE 테스트 모두 통과) |

---

## Technical Design

### 1. 조언 생성 순수 함수: `buildAdviceChips()`

**위치:** `frontend/src/presentation/pages/home/advice-chips.ts`

Backend `BriefingAdviceService`의 규칙을 클라이언트 사이드 순수 함수로 포팅한다. 입력은 기존 `useHomeData`가 이미 보유한 데이터를 그대로 사용한다.

```typescript
// ---- Types ----

type AdviceSeverity = 'info' | 'warning' | 'danger';
type AdviceCategory = 'umbrella' | 'mask' | 'clothing' | 'transit' | 'temperature' | 'wind';

type AdviceChipData = {
  id: string;           // 고유 키 (렌더링용)
  category: AdviceCategory;
  severity: AdviceSeverity;
  icon: string;         // emoji
  message: string;      // 한국어 조언 (15자 이내)
  ariaLabel: string;    // 스크린 리더용 전체 설명
};

// ---- Input (기존 타입 재사용) ----

type AdviceInput = {
  weather: WeatherData | null;
  airQuality: { label: string; className: string; pm10?: number; pm25?: number };
};

// ---- Output ----

// 최대 4개, severity 순 정렬
function buildAdviceChips(input: AdviceInput): AdviceChipData[];
```

### 2. 조언 생성 규칙 (Rule Engine)

모든 규칙은 한국 기후 기준, 한국어 메시지로 작성한다.

#### 2-1. 기온별 옷차림 조언

체감온도(`feelsLike`)를 우선 사용하고, 없으면 실제 기온(`temperature`) 사용.

| 기온 범위 | icon | message | severity |
|----------|------|---------|----------|
| <= -10 | `🥶` | 패딩 필수 | danger |
| -10 ~ 0 | `🧥` | 두꺼운 외투 필수 | warning |
| 0 ~ 5 | `🧥` | 코트 입으세요 | warning |
| 5 ~ 10 | `🧶` | 자켓 + 니트 추천 | info |
| 10 ~ 15 | `👔` | 가벼운 겉옷 | info |
| 15 ~ 20 | `👕` | 긴팔 또는 얇은 겉옷 | info |
| 20 ~ 25 | `👕` | 반팔 가능 | info |
| 25 ~ 28 | `☀️` | 반팔, 수분 섭취 | info |
| 28 ~ 33 | `🥵` | 더위 주의 | warning |
| >= 33 | `🔥` | 폭염 경보, 외출 자제 | danger |

**특수 규칙 (Should have):**
- 일교차 >= 10도 (`forecast.maxTemp - forecast.minTemp`): "일교차 N도, 겉옷 챙기세요" (warning)
- 체감온도와 기온 차이 >= 5도: "바람 강해 체감 N도" (warning)

#### 2-2. 강수/날씨 조건 조언

| 조건 | icon | message | severity |
|------|------|---------|----------|
| condition에 `thunder` 포함 | `⛈️` | 뇌우 예보, 외출 주의 | danger |
| condition에 `snow` 포함 | `❄️` | 눈 예보, 미끄럼 주의 | warning |
| condition에 `rain`/`drizzle` 포함 | `🌂` | 우산 챙기세요 | warning |
| forecast 최대 rainProbability >= 60% | `🌂` | 우산 필수 (강수확률 N%) | warning |
| forecast 최대 rainProbability 40~59% | `🌂` | 우산 챙기면 좋겠어요 | info |
| condition에 `mist`/`fog`/`haze` 포함 | `🌫️` | 시야 주의 | info |

**강수확률 판정:** `weather.forecast.hourlyForecasts` 배열에서 전체 시간대의 `rainProbability` 최대값을 사용. 현재 condition이 이미 비/눈이면 강수확률 조언은 중복이므로 생략.

#### 2-3. 미세먼지 조언

기존 `getAqiStatus()` 함수의 className 값을 기반으로 판정:

| className | icon | message | severity |
|-----------|------|---------|----------|
| `aqi-good` | `😊` | 공기 좋아요 | info |
| `aqi-moderate` | `😐` | 미세먼지 보통 | info |
| `aqi-bad` | `😷` | 마스크 착용 권장 | warning |
| `aqi-very-bad` | `🤢` | 마스크 필수 | danger |

**PM2.5 보정 (Should have):** `pm25 > 35`이면 등급을 한 단계 올림.

#### 2-4. 조언 우선순위 및 제한

- 최대 **4개** 조언만 반환 (375px 모바일에서 2x2 그리드)
- 정렬: `danger` > `warning` > `info`
- 같은 severity 내: `umbrella` > `mask` > `clothing` > `transit` > `temperature` > `wind`
- `aqi-good`과 `aqi-moderate`는 severity가 `info`이므로 공간이 부족하면 다른 warning/danger에 의해 밀려남

### 3. Frontend 컴포넌트 구조

```
HomePage
  |-- WeatherHeroSection (기존, 변경 없음)
  |-- AdviceChipGrid (NEW) <---- 날씨 카드 바로 아래, collapsible 외부
  |     |-- AdviceChip x 4 (최대)
  |-- MorningBriefing (기존, 경로 설정 사용자만)
  |-- ... (이하 기존 컴포넌트)
```

### 4. AdviceChip 컴포넌트

**파일:** `frontend/src/presentation/pages/home/AdviceChip.tsx`

```
┌───────────────────────────────────────────────────┐
│  출근길 포인트                                      │  <-- section title
│                                                   │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ 🧥 코트 입으세요 │  │ 🌂 우산 챙기세요 │               │
│  └──────────────┘  └──────────────┘               │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ 😷 마스크 권장  │  │ 😊 공기 좋아요  │               │
│  └──────────────┘  └──────────────┘               │
└───────────────────────────────────────────────────┘
```

**칩 색상:**
- `info`: `#F3F4F6` (gray-100) 배경, `#374151` (gray-700) 텍스트
- `warning`: `#FEF3C7` (amber-100) 배경, `#92400E` (amber-800) 텍스트
- `danger`: `#FEE2E2` (red-100) 배경, `#991B1B` (red-800) 텍스트

**접근성 요구사항:**
- 각 칩에 `aria-label` 포함 (예: "경고: 코트 입으세요, 현재 기온 3도")
- 색상 외에 아이콘(emoji)과 텍스트로 정보 전달 (색맹 사용자 대응)
- 칩 그리드 section에 `aria-label="오늘의 조언"` 적용
- severity `danger`인 칩에는 텍스트 앞에 "!" 아이콘 추가 (시각적 강조)

**반응형 디자인:**
- 375px: 2열 그리드, 칩 간격 8px
- 칩 높이: 최소 40px (터치 타겟 기준)
- 텍스트: 14px, 줄바꿈 없이 말줄임 처리
- 메시지 최대 15자 권장 (한국어 기준)

### 5. HomePage 통합

**`use-home-data.ts` 변경:**

`buildAdviceChips()` 호출을 `useMemo`로 래핑하여 파생 상태로 계산:

```typescript
// use-home-data.ts에 추가
const adviceChips = useMemo(() => {
  if (!weather) return [];
  return buildAdviceChips({
    weather,
    airQuality: { ...airQuality, pm10: airQualityData?.pm10, pm25: airQualityData?.pm25 },
  });
}, [weather, airQuality, airQualityData]);
```

**`HomePage.tsx` 변경:**

`WeatherHeroSection` 직후, `MorningBriefing` 직전에 `AdviceChipGrid` 삽입:

```tsx
{data.weather && data.adviceChips.length > 0 && (
  <AdviceChipGrid chips={data.adviceChips} />
)}
```

### 6. CSS 스타일

**파일:** `frontend/src/presentation/index.css`에 추가 (기존 글로벌 CSS 패턴 따름)

```css
/* ─── Advice Chips ──────────────────────────── */
.advice-chip-grid { ... }
.advice-chip { ... }
.advice-chip--info { ... }
.advice-chip--warning { ... }
.advice-chip--danger { ... }
```

### 7. 기존 코드 영향 분석

| 기존 코드 | 변경 여부 | 설명 |
|-----------|----------|------|
| `WeatherHeroSection.tsx` | 변경 없음 | 독립적 컴포넌트, 조언 칩은 별도 section |
| `weather-utils.tsx` | 변경 없음 | `getWeatherAdvice()`는 날씨 상세 내부에서 계속 사용 |
| `getWeatherChecklist()` | 변경 없음 | 기존 체크리스트와 보완적 관계 유지 |
| `use-home-data.ts` | 소규모 변경 | `adviceChips` 파생 상태 추가 (useMemo) |
| `HomePage.tsx` | 소규모 변경 | AdviceChipGrid 컴포넌트 렌더링 추가 |
| `build-briefing.ts` | 변경 없음 | MorningBriefing은 독립적으로 유지 |
| `MorningBriefing.tsx` | 변경 없음 | 경로 설정 사용자 전용, 조언 칩과 별개 |
| `index.css` | 추가 | advice-chip 관련 CSS 클래스 추가 |

### 8. DB Schema

**새로운 테이블 불필요.** 조언은 이미 fetch된 날씨/미세먼지 데이터에서 실시간 계산된다.

---

## Acceptance Criteria

### Must Have

```gherkin
AC-1: 기온 기반 옷차림 조언
Given 현재 기온이 3도이고 날씨 데이터가 로드된 상태일 때,
When 홈 화면의 조언 칩 영역을 볼 때,
Then "코트 입으세요" 텍스트와 🧥 아이콘이 포함된 warning 칩이 표시된다.

AC-2: 비 예보 시 우산 조언
Given weather condition이 "Rain"일 때,
When 조언 칩을 생성할 때,
Then "우산 챙기세요" 텍스트와 🌂 아이콘이 포함된 warning 칩이 포함된다.

AC-3: 미세먼지 나쁨 시 마스크 조언
Given airQuality className이 "aqi-bad"일 때,
When 조언 칩을 생성할 때,
Then "마스크 착용 권장" 텍스트와 😷 아이콘이 포함된 warning 칩이 포함된다.

AC-4: 미세먼지 매우나쁨 시 위험 조언
Given airQuality className이 "aqi-very-bad"일 때,
When 조언 칩을 생성할 때,
Then "마스크 필수" 텍스트와 🤢 아이콘이 포함된 danger 칩이 포함된다.

AC-5: 조언 최대 4개 제한
Given 기온 3도(warning) + 비(warning) + 미세먼지 나쁨(warning) + 뇌우(danger) + 일교차 12도(warning) 등 5개 이상 조건이 충족될 때,
When 조언 칩을 생성할 때,
Then 최대 4개만 severity 순으로 반환된다.

AC-6: severity 정렬 순서
Given danger와 info 조언이 혼재할 때,
When 칩 목록을 정렬할 때,
Then danger > warning > info 순서로 표시된다.

AC-7: 날씨 데이터 없을 때 빈 상태
Given weather가 null일 때,
When 홈 화면을 볼 때,
Then 조언 칩 영역이 렌더링되지 않는다 (빈 상태, 에러 없음).

AC-8: 접근성 - 색상 독립 정보 전달
Given 조언 칩이 렌더링될 때,
When 색상을 제거(흑백)해도,
Then 아이콘(emoji)과 텍스트만으로 조언의 의미를 파악할 수 있다.

AC-9: 접근성 - aria-label
Given 조언 칩이 렌더링될 때,
When 스크린 리더가 칩을 읽을 때,
Then "경고: 코트 입으세요" 형태의 aria-label이 제공된다.

AC-10: 모바일 레이아웃 - 2열 그리드
Given 375px 뷰포트에서 조언이 4개일 때,
When 칩 그리드가 렌더링될 때,
Then 2x2 그리드로 표시되고 가로 스크롤이 발생하지 않는다.

AC-11: 빌드 통과
Given 모든 변경사항을 적용한 후,
When tsc --noEmit을 실행할 때,
Then 타입 에러 0개로 통과한다.

AC-12: 기존 테스트 통과
Given 모든 변경사항을 적용한 후,
When npm run test를 실행할 때,
Then 기존 394개 + 신규 테스트 모두 통과한다.
```

### Should Have

```gherkin
AC-13: 일교차 경고
Given forecast.maxTemp이 15도이고 forecast.minTemp이 3도일 때 (일교차 12도),
When 조언 칩을 생성할 때,
Then "일교차 12도, 겉옷 챙기세요" 칩이 추가된다.

AC-14: 체감온도 기반 조언
Given 기온이 5도이고 feelsLike가 -1도일 때,
When 옷차림 조언을 생성할 때,
Then 체감온도(-1도) 기준으로 "두꺼운 외투 필수" 조언이 생성된다.

AC-15: 강수확률 기반 우산 조언
Given condition이 "Clear"이지만 hourlyForecasts 중 최대 rainProbability가 65%일 때,
When 조언을 생성할 때,
Then "우산 필수 (강수확률 65%)" 칩이 생성된다.
```

---

## Task Breakdown

### Frontend Tasks

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| FE-1 | `AdviceChipData` 타입 정의 | XS | none | `advice-chips.ts`에 `AdviceChipData`, `AdviceSeverity`, `AdviceCategory` 타입 정의 |
| FE-2 | `buildAdviceChips()` 순수 함수 구현 | M | FE-1 | 기온/강수/미세먼지 조언 생성 로직. Backend `BriefingAdviceService` 규칙 포팅 |
| FE-3 | `buildAdviceChips()` 유닛 테스트 | M | FE-2 | 모든 기온 범위, 강수 조건, 미세먼지 등급 테스트 (최소 15개 케이스). `advice-chips.test.ts` |
| FE-4 | `AdviceChip` 컴포넌트 구현 | S | FE-1 | severity별 색상, icon + message, aria-label. `AdviceChip.tsx` |
| FE-5 | `AdviceChipGrid` 컴포넌트 구현 | S | FE-4 | 2열 그리드 레이아웃, section title, 빈 상태 처리. `AdviceChipGrid.tsx` |
| FE-6 | CSS 스타일 추가 | S | FE-5 | `index.css`에 `.advice-chip-grid`, `.advice-chip`, severity 색상 클래스 추가 |
| FE-7 | `use-home-data.ts` 확장 | S | FE-2 | `adviceChips` 파생 상태 추가 (`useMemo`), `UseHomeDataReturn` 인터페이스 확장 |
| FE-8 | `HomePage.tsx` 통합 | S | FE-5, FE-7 | WeatherHeroSection 하단에 AdviceChipGrid 렌더링 |
| FE-9 | 컴포넌트 테스트 | S | FE-5, FE-8 | AdviceChip/AdviceChipGrid 렌더링 검증, 접근성 속성 검증. `AdviceChipGrid.test.tsx` |
| FE-10 | 빌드 검증 + lint | XS | FE-8 | `tsc --noEmit && npm run lint && npm run test && npm run build` 전체 통과 확인 |

### 의존성 그래프

```
FE-1 ─┬─ FE-2 ── FE-3  (타입 + 로직 + 테스트)
      │
      └─ FE-4 ── FE-5 ── FE-6  (컴포넌트 + 스타일)
                   |
FE-2 ── FE-7 ─────┘
                   |
         FE-8 ── FE-9 ── FE-10  (통합 + 검증)
```

**병렬 가능:**
- FE-1 완료 후: FE-2~FE-3 (로직)과 FE-4~FE-6 (컴포넌트) 병렬 진행 가능
- FE-7은 FE-2에만 의존

**예상 소요:** 총 4~5시간 (1인 기준 0.5일)

---

## Existing Code Reuse Map

| 재사용 대상 | 위치 | 활용 방식 |
|------------|------|----------|
| `WeatherData` 타입 | `frontend/src/infrastructure/api/weather-api.client.ts` | 조언 함수의 입력 타입으로 그대로 사용 |
| `getAqiStatus()` | `frontend/src/presentation/pages/home/weather-utils.tsx` | airQuality className 값으로 미세먼지 등급 판정 |
| `getWeatherType()` | `weather-utils.tsx` | 날씨 condition 분류 (sunny/cloudy/rainy/snowy) |
| `RAIN_PROBABILITY_THRESHOLD` | `weather-utils.tsx` | 강수확률 기준값 (40) 재사용 |
| `COLD_TEMP_THRESHOLD` | `weather-utils.tsx` | 추위 기준값 (5) 참고 |
| `HOT_TEMP_THRESHOLD` | `weather-utils.tsx` | 더위 기준값 (28) 참고 |
| `TEMP_DIFF_THRESHOLD` | `weather-utils.tsx` | 일교차 기준값 (10) 재사용 |
| `useHomeData` hook | `use-home-data.ts` | weather, airQuality, airQualityData 기존 반환값 활용 |
| BE `BriefingAdviceService` | `backend/src/application/services/briefing-advice.service.ts` | 조언 규칙 로직의 참조 구현 (로직 포팅 대상) |
| BE `BriefingAdviceDto` | `backend/src/application/dto/briefing.dto.ts` | 타입 구조 참고 (FE는 독자적 타입 정의) |

---

## Decision Log

| Date | Decision | Alternatives Considered | Rationale |
|------|----------|------------------------|-----------|
| 2026-02-26 | 클라이언트 사이드 조언 생성 (BE API 호출 없음) | BE `/briefing` 엔드포인트 추가 | PWA는 이미 weather/airQuality를 개별 fetch하므로 추가 API 호출은 낭비. 순수 함수로 즉시 계산 가능 |
| 2026-02-26 | WeatherHeroSection 하단에 별도 section으로 배치 | WeatherHeroSection 내부 collapsible 안에 배치 | 조언은 항상 보여야 하므로 collapsible 외부에 배치. 접근성과 가시성 우선 |
| 2026-02-26 | 기존 `getWeatherAdvice()` 유지 | 대체 (조언 칩으로 완전 교체) | 날씨 상세 내부의 한 줄 조언은 보조 역할로 유지. 조언 칩과 역할이 다름 (상세 vs 요약) |
| 2026-02-26 | 기존 체크리스트(`getWeatherChecklist()`) 유지 | 조언 칩으로 대체 | 체크리스트는 "챙겼는지 확인" (인터랙티브), 조언 칩은 "무엇을 해야 하는지" (정보 표시). 보완적 관계 |
| 2026-02-26 | 교통 조언은 Could have로 분류 | Must have에 포함 | transitInfos가 경로 설정 사용자에게만 있으므로 범위를 좁힘. MorningBriefing이 이미 교통 정보를 표시 |
| 2026-02-26 | 최대 4개 칩 제한 | 스크롤 가능한 무제한 칩 | 375px 모바일에서 2x2 그리드가 최적. 5개 이상은 시각적 과부하 |

---

## Out of Scope

- **Backend 변경 없음** -- 기존 `BriefingAdviceService`와 `/widget/data` 응답은 이미 구현 완료. 이 스펙은 PWA 프론트엔드만 다룬다.
- **교통 상황 조언** -- transitInfos는 경로 설정 사용자에게만 존재하며, MorningBriefing이 이미 해당 정보를 표시. Could have로 분류.
- **사용자 선호 설정** -- 민감 체질 토글, 조언 종류 선택 등은 추후 고도화.
- **AI/ML 기반 개인화** -- Phase 3 범위 (P3-1).
- **대안 경로 제시** -- P3-5 별도 항목.
- **알림톡 브리핑 포함** -- 기존 Solapi 템플릿 변경 불필요.
- **E2E 테스트** -- 유닛 + 컴포넌트 테스트로 충분. E2E는 Phase 완료 후 일괄 추가.
- **위젯 연동** -- PWA에는 위젯 개념 없음. 네이티브 앱 위젯은 이미 `/widget/data`에서 briefing 포함.

---

## Open Questions (Resolved)

| # | Question | Resolution |
|---|----------|-----------|
| 1 | BE와 FE 양쪽에 조언 로직을 두면 동기화 문제가 발생하지 않나? | FE는 PWA 전용, BE는 위젯/네이티브 전용. 규칙 테이블이 동일하므로 테스트로 동기화 보장. 규칙이 안정화되면 BE를 canonical source로 전환 검토. |
| 2 | 기존 날씨 체크리스트와 중복되지 않나? | 역할이 다름. 체크리스트 = "챙겼는지 확인" (인터랙티브, collapsible 내부), 조언 칩 = "무엇을 해야 하는지" (정보 표시, 항상 노출). |
| 3 | 출근/퇴근 모드를 구분해야 하나? | P2-3에서는 시간대별 contextLabel("출근길 포인트" vs "퇴근길 포인트")만 변경. 퇴근 전용 조언은 P2-4로 이관. |

---

*Spec by PM Agent | P2-3 | 2026-02-26*
