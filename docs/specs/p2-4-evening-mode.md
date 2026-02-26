# P2-4: 퇴근 모드 (Evening / Commute-Home Mode)

> 오후 시간대에 홈 화면을 자동으로 퇴근 모드로 전환하여, 귀가 경로의 교통 정보와 예상 귀가 시간을 표시한다. 사용자가 별도 조작 없이도 출근/퇴근 맥락에 맞는 정보를 받을 수 있게 한다.

---

## Executive Summary

현재 홈 화면에는 시간대 인식 인프라가 부분적으로 구현되어 있다. `getTimeContext()` (build-briefing.ts)는 12시 이후를 `evening`으로, `getActiveRoute()` (route-utils.ts)는 14시 이후를 evening route 선택 기준으로 사용한다. `BriefingSection`은 이미 "출근 브리핑" / "퇴근 브리핑" 라벨을 자동 전환하며, `CommuteSection`의 route badge도 routeType에 따라 "출근"/"퇴근"을 표시한다.

그러나 이 전환들은 산발적이다. `MorningBriefing` 컴포넌트 이름 자체가 출근 전용이고, greeting은 시간대를 반영하지만 "출근/퇴근" 맥락을 반영하지 않는다. 무엇보다 **귀가 시간 예측**이 없어 퇴근 시간대에 사용자에게 핵심 가치("몇 시에 집에 도착하나?")를 전달하지 못한다.

**Why now:** P2-3(상황 인식 브리핑)에서 시간대별 조언 칩 인프라를 구축했다. 이 위에 퇴근 모드를 얹으면 추가 비용이 적다. 경로(`morning`/`evening` routeType)와 시간대 인식(`getTimeContext`, `getActiveRoute`)이 이미 작동 중이므로, 정합성을 맞추고 귀가 시간 예측만 추가하면 된다.

**Expected impact:** 퇴근 시간대(14:00~03:59)에 홈 화면의 정보 관련성이 비약적으로 향상. "출근길 정보를 퇴근길에도 보고 있는" 문제 해소.

---

## Discovery Context

### Opportunity Solution Tree

```
Desired Outcome: 퇴근 시간에도 출근만큼 유용한 홈 화면 제공
  -> Opportunity A: 오후에 귀가 경로 교통 정보 자동 표시
      -> Solution A1: 시간 기반 자동 전환 (이 스펙) -- 선택
      -> Solution A2: 위치 기반 전환 (GPS로 사무실 감지)
  -> Opportunity B: "집에 몇 시에 도착하나?" 핵심 질문에 답변
      -> Solution B1: 경로 총 예상 시간 기반 도착 예측 (이 스펙) -- 선택
      -> Solution B2: 실시간 교통 API + ML 예측 (P3-1 범위)
  -> Opportunity C: 퇴근 시간대에 맞는 날씨 조언
      -> Solution C1: 기존 BriefingSection의 timeContext 활용 (이미 작동 중)
```

### JTBD

```
When 퇴근 시간(14시 이후)에 홈 화면을 열었을 때,
I want to 귀가 경로의 교통 상황과 예상 도착 시간을 즉시 확인하고 싶다,
so I can 최적의 퇴근 시점을 결정하고 가족에게 도착 시간을 알려줄 수 있다.
```

**Forces of Progress:**
- Push (pain): 출근 경로 정보가 퇴근 시간에도 표시되어 쓸모없음
- Pull (attraction): "18:42 도착 예상" 한 줄이면 퇴근 의사결정 완료
- Anxiety (risk): 전환이 갑작스러우면 혼란 -> 부드러운 전환 + 수동 토글로 해소
- Inertia (habit): 사용자가 이미 route toggle(자동/출근/퇴근)을 사용 -> 학습 비용 없음

---

## Problem

- **Who:** 대중교통으로 출퇴근하는 수도권 직장인 (핵심 타겟)
- **Pain:** 오후에 앱을 열면 출근 경로 정보가 보임 (빈도: 일 1회, 심각도: 중간)
- **Current workaround:** 수동으로 route type toggle을 "퇴근"으로 변경하거나, 별도 교통 앱 사용
- **현재 PWA 상태 (무엇이 이미 작동하고 무엇이 빠져있는지):**

### 이미 작동하는 시간대 인식

| 요소 | 위치 | 동작 | 전환 시점 |
|------|------|------|----------|
| `getActiveRoute()` | `route-utils.ts` | evening route 자동 선택 | 14시 |
| `BriefingSection` label | `BriefingSection.tsx` | "출근 브리핑" -> "퇴근 브리핑" | 12시 |
| `MorningBriefing` label | `build-briefing.ts` | "출근 브리핑" -> "퇴근 브리핑" | 12시 |
| `MorningBriefing` style | `home.css` | 배경색 변경 (amber -> violet) | 12시 |
| Route badge | `CommuteSection.tsx` | routeType에 따라 "출근"/"퇴근" | route에 따름 |
| Route toggle | `CommuteSection.tsx` | 자동/출근/퇴근 수동 전환 | 수동 |
| `getGreeting()` | `weather-utils.tsx` | 시간대별 인사말 | 여러 시점 |
| Widget API | `widget-data.service.ts` | `mode` 파라미터로 commute/return 구분 | API 파라미터 |
| BE `BriefingAdviceService` | `briefing-advice.service.ts` | 14시(KST) 기준 morning/evening 전환 | 14시 |

### 빠져있는 것

| 누락 항목 | 설명 |
|-----------|------|
| 귀가 시간 예측 | "약 18:42 도착 예상" -- 핵심 가치 미제공 |
| "출발하기" 버튼 라벨 | 퇴근 시에도 "출발하기"로 표시 (맥락 불일치) |
| DeparturePrediction 라벨 | "추천 출발" 라벨이 출근/퇴근 구분 없음 |
| StatsSection 라벨 | "오늘의 출퇴근" 고정 라벨 |
| 홈 전체 색상 테마 | 아침/저녁 시각적 구분 없음 |
| evening route 없을 때 안내 | morning만 있고 evening 없을 때 등록 유도 없음 |

---

## Solution

### Overview

**핵심 아이디어:** 오후 시간대(14시 이후)에 홈 화면의 라벨, 색상, 데이터 소스를 자동으로 퇴근 맥락으로 전환하고, **귀가 예상 도착 시간**을 새로 추가한다.

**접근 방식:**
1. 기존 `getTimeContext()` 함수를 전체 홈 화면의 시간 맥락 판단 기준으로 통일 (현재 12시와 14시로 분리된 기준 정리)
2. 시간 맥락에 따라 라벨/색상을 동적으로 변경하는 `useTimeContext()` 훅 추가
3. 귀가 예상 시간을 `totalExpectedDuration` 기반으로 클라이언트 사이드 계산 (추가 API 호출 없음)
4. evening route 미등록 시 귀가 경로 등록 유도 CTA 표시

### User Flow

```
1. 사용자가 14시 이후에 홈 화면을 연다
2. useTimeContext() 훅이 'evening' 반환
3. 홈 화면이 자동으로 퇴근 모드로 전환:
   a. getActiveRoute()가 evening route를 선택 (이미 구현됨)
   b. BriefingSection이 "퇴근 브리핑" 표시 (이미 구현됨)
   c. CommuteSection 버튼이 "퇴근 출발" 표시 (신규)
   d. ArrivalEstimate 카드가 "약 19:15 도착 예상" 표시 (신규)
   e. MorningBriefing의 contextLabel이 "퇴근 브리핑" 표시 (이미 구현됨)
4. 사용자는 route toggle로 수동 전환도 가능 (기존 유지)
```

### Scope (MoSCoW)

**Must have (60% effort):**
- FE: `useTimeContext()` 훅 -- 홈 화면 전체에서 사용할 시간 맥락 제공
- FE: `ArrivalEstimate` 컴포넌트 -- 귀가 예상 도착 시간 표시
- FE: `estimateArrivalTime()` 순수 함수 -- 현재 시각 + totalExpectedDuration 기반 도착 시간 계산
- FE: CommuteSection 버튼 라벨 동적 변경 ("출발하기" -> "퇴근 출발")
- FE: DeparturePrediction 라벨 동적 변경 ("추천 출발" -> context 반영)
- FE: evening route 없을 때 귀가 경로 등록 유도 CTA
- FE: 유닛 테스트 -- estimateArrivalTime, useTimeContext, 라벨 변경 검증
- FE: 컴포넌트 테스트 -- ArrivalEstimate 렌더링 검증

**Should have:**
- FE: 홈 배경 색상/그라데이션 미세 변경 (아침: warm, 저녁: cool tone)
- FE: StatsSection 라벨 동적 변경 ("오늘의 출퇴근" 유지 but "통계" 탭 분리)
- FE: 퇴근 모드 전환 시 부드러운 CSS transition

**Could have:**
- FE: "출발하기" 클릭 시 자동으로 evening session 시작
- FE: 교통 혼잡도 감안한 도착 시간 보정 (transitInfos 활용)
- BE: widget API에 estimatedArrivalTime 필드 추가

**Won't have (this cycle):**
- BE: 실시간 교통 기반 도착 시간 예측 (P3-1 ML 범위)
- FE: 대안 경로 자동 제시 (P3-5 범위)
- FE: 퇴근 알림 (EventBridge 스케줄 별도 설정)
- FE: 다크 모드 전용 퇴근 테마

---

## Riskiest Assumptions

| # | Category | Assumption | Risk | Test Method |
|---|----------|-----------|------|-------------|
| 1 | Desirability | 사용자가 퇴근 시간에도 이 앱을 연다 | Medium | 시간대별 접속 로그 분석. P2-1 geofence 데이터에서 퇴근 감지 빈도 확인 |
| 2 | Usability | 14시 기준 자동 전환이 대부분 사용자에게 적절하다 | Low | 기존 route-utils.ts에서 14시 기준이 이미 사용 중. route toggle로 수동 전환 가능하므로 리스크 낮음 |
| 3 | Feasibility | totalExpectedDuration 기반 도착 예측이 실용적이다 | Medium | 고정 값이므로 교통 상황 미반영. "약" 표현으로 기대치 관리. 실제 세션 완료 데이터(commuteStats)로 보정 가능 |
| 4 | Viability | evening route를 등록한 사용자가 충분하다 | Medium | evening route 없을 때 등록 유도 CTA로 전환율 측정 |

---

## Success Metrics

### OKR

**Objective:** 퇴근 시간대에도 홈 화면이 사용자에게 관련성 높은 정보를 제공한다

| Key Result | Target | Baseline |
|-----------|--------|----------|
| 14시 이후 홈 화면에서 evening route 표시율 | >= 80% (evening route 보유 사용자 중) | 측정 필요 |
| 귀가 예상 시간 노출 세션 비율 (evening route 보유) | >= 90% | 0% (미구현) |
| evening route 미등록자의 등록 CTA 클릭율 | >= 15% | N/A |

### North Star Connection

"By building 퇴근 모드 자동 전환, we expect 14시 이후 앱 유용성이 출근 시간대와 동일 수준으로 향상될 것이다. Because 사용자가 가장 궁금한 '몇 시에 집에 도착하나?'에 즉시 답할 수 있기 때문이다."

### Metrics Table

| Type | Metric | Target |
|------|--------|--------|
| **Primary** | 귀가 예상 시간 노출률 (evening route 보유자) | >= 90% |
| **Leading** | evening route 신규 등록 수 (CTA 통한) | 측정 |
| **Guardrail** | 홈 화면 로드 시간 | 변화 없음 (추가 API 호출 0) |
| **Guardrail** | 기존 테스트 통과율 | 100% |

---

## Technical Design

### 1. 시간 맥락 기준 통일

현재 두 가지 기준이 혼재한다:
- `getTimeContext()` (build-briefing.ts): 6~11시 morning, 12~17시 evening, 나머지 tomorrow
- `getActiveRoute()` (route-utils.ts): 14시 미만 morning, 14시 이상 evening

**통일 방안:** `getTimeContext()`를 canonical source로, `getActiveRoute()`의 14시 기준은 유지한다. 이유: `getTimeContext()`는 라벨/조언용이고, `getActiveRoute()`는 교통 데이터용이다. 교통 데이터는 14시부터 퇴근 경로를 보여주는 것이 합리적이고, 12시~14시 사이에 "퇴근 브리핑" 라벨이 뜨되 경로는 아직 출근 경로인 것이 자연스럽다 (점심시간).

**실제 변경 없음.** 기존 기준들을 그대로 유지하되, 홈 화면 컴포넌트들이 참조하는 시간 맥락을 `useTimeContext()` 훅을 통해 일관되게 접근하도록 한다.

### 2. `useTimeContext()` 훅

**위치:** `frontend/src/presentation/pages/home/use-time-context.ts`

기존 `getTimeContext()`를 래핑하되, `forceRouteType` 상태와 연동하여 수동 전환도 지원한다.

```typescript
type CommuteContext = {
  /** 현재 시간대 맥락 */
  timeContext: TimeContext;         // 'morning' | 'evening' | 'tomorrow'
  /** 교통 데이터 기준 (route 선택용, 14시 기준) */
  isEveningCommute: boolean;
  /** UI 라벨 (한국어) */
  commuteLabel: string;            // '출근' | '퇴근'
  /** 브리핑 라벨 */
  briefingLabel: string;           // '출근 브리핑' | '퇴근 브리핑' | '내일 출근 브리핑'
  /** 출발 버튼 라벨 */
  departureButtonLabel: string;    // '출발하기' | '퇴근 출발'
};

function useTimeContext(forceRouteType: 'auto' | 'morning' | 'evening'): CommuteContext;
```

**로직:**
- `forceRouteType === 'auto'`: 시간 기반 자동 결정
- `forceRouteType === 'morning'`: 강제 출근 모드
- `forceRouteType === 'evening'`: 강제 퇴근 모드

이 훅은 순수 계산이므로 `useMemo`로 래핑하고, `getTimeContext()`와 시간 기준을 재사용한다.

### 3. `ArrivalEstimate` 컴포넌트

**위치:** `frontend/src/presentation/pages/home/ArrivalEstimate.tsx`

귀가 예상 도착 시간을 표시하는 카드. evening 모드에서만 렌더링된다.

```
┌─────────────────────────────────────────────────┐
│  🏠  약 19:15 도착 예상                           │
│      강남역 → 집 (약 45분)                        │
└─────────────────────────────────────────────────┘
```

**Props:**

```typescript
type ArrivalEstimateProps = {
  /** 활성 evening route */
  route: RouteResponse;
  /** 과거 평균 통근 시간 (분, commuteStats에서 파생) */
  averageDuration: number | null;
};
```

**도착 시간 계산 로직 (`estimateArrivalTime`):**

```typescript
/**
 * 예상 도착 시간을 계산한다.
 *
 * 우선순위:
 * 1. commuteStats의 overallAverageDuration (3회 이상 기록 시)
 * 2. route.totalExpectedDuration (경로 설정 시 입력한 예상 시간)
 * 3. null (데이터 부족)
 */
function estimateArrivalTime(params: {
  now: Date;
  averageDuration: number | null;
  routeDuration: number | undefined;
}): { arrivalTime: string; durationMinutes: number; source: 'stats' | 'route' } | null;
```

- `arrivalTime`: "19:15" 형식 (HH:MM)
- `durationMinutes`: 예상 소요 시간 (분)
- `source`: 계산 근거 (`stats`=실측 기반, `route`=설정 기반)

**표시 규칙:**
- 기본: "약 19:15 도착 예상" (source=stats일 때 신뢰도 높으므로 "약" 없이 표시 가능)
- source가 `route`일 때: "약 19:15 도착 예상 (경로 기준)"
- source가 `stats`일 때: "19:15 도착 예상 (평균 기록 기반)"
- 데이터 없을 때: 컴포넌트를 렌더링하지 않음

**위치:** `CommuteSection` 내부, transit arrivals 아래, 출발 버튼 위.

### 4. CommuteSection 변경

**버튼 라벨 동적 변경:**

```tsx
// 현재
<button>출발하기</button>

// 변경
<button>{isEveningCommute ? '퇴근 출발' : '출발하기'}</button>
```

**evening route 없을 때 CTA:**

현재 `today-empty`는 "출근 경로를 등록해보세요"만 표시한다. evening 모드에서 morning route만 있고 evening route가 없을 때:

```tsx
// evening 시간대 + morning route만 있을 때
<div className="today-evening-cta">
  <p>귀가 경로를 등록하면 도착 예상 시간을 알려드려요</p>
  <Link to="/routes">귀가 경로 등록</Link>
</div>
```

이 CTA는 activeRoute가 morning 타입이고 시간대가 evening일 때, 또는 evening route가 전혀 없을 때 CommuteSection 하단에 표시한다. 기존 transit 정보와 출발 버튼은 morning route 기반으로 그대로 유지한다 (퇴근 시 출근 경로 역방향으로 귀가하는 사용자도 있으므로).

### 5. HomePage 통합

**변경 지점:**

```tsx
// use-home-data.ts에서 useTimeContext 결과를 반환
const commuteContext = useTimeContext(forceRouteType);

// HomePage.tsx에서 ArrivalEstimate 렌더링
{commuteContext.isEveningCommute && data.activeRoute?.routeType === 'evening' && (
  <ArrivalEstimate
    route={data.activeRoute}
    averageDuration={
      data.commuteStats?.overallAverageDuration &&
      (data.commuteStats?.totalSessions ?? 0) >= 3
        ? data.commuteStats.overallAverageDuration
        : null
    }
  />
)}
```

ArrivalEstimate는 CommuteSection 내부에 통합하거나, CommuteSection 바로 아래에 독립적으로 배치한다. CommuteSection 내부가 적절하다 (경로 + 교통 + 도착 예측이 한 카드에).

### 6. DeparturePrediction 라벨 변경

현재 "추천 출발 {시간}"으로 고정. 퇴근 모드에서는:

```tsx
// 현재
<span>추천 출발 {prediction.recommendedTime}</span>

// 변경
<span>{isEveningCommute ? '추천 퇴근' : '추천 출발'} {prediction.recommendedTime}</span>
```

### 7. CSS 변경

**`home.css` 추가:**

```css
/* ========== Arrival Estimate ========== */

.arrival-estimate {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-top: 12px;
  background: linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%);
  border: 1px solid #c4b5fd;
  border-radius: var(--radius-lg, 12px);
}

.arrival-estimate-icon {
  font-size: 1.25rem;
}

.arrival-estimate-time {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
}

.arrival-estimate-detail {
  font-size: 0.8125rem;
  color: var(--text-secondary, #6b7280);
}

/* ========== Evening CTA ========== */

.today-evening-cta {
  margin-top: 12px;
  padding: 12px 16px;
  background: rgba(139, 92, 246, 0.05);
  border: 1px dashed #c4b5fd;
  border-radius: var(--radius-lg, 12px);
  text-align: center;
}

.today-evening-cta p {
  font-size: 0.8125rem;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 8px;
}
```

### 8. 기존 코드 영향 분석

| 기존 코드 | 변경 여부 | 설명 |
|-----------|----------|------|
| `route-utils.ts` | 변경 없음 | `getActiveRoute()`의 14시 기준 그대로 유지 |
| `build-briefing.ts` | 변경 없음 | `getTimeContext()`는 canonical source로 유지 |
| `BriefingSection.tsx` | 변경 없음 | 이미 timeContext 기반 라벨 전환 구현 완료 |
| `MorningBriefing.tsx` | 변경 없음 | 이미 context에 따른 라벨/스타일 전환 구현 완료 |
| `CommuteSection.tsx` | 소규모 변경 | 버튼 라벨 동적 변경, ArrivalEstimate 통합, evening CTA 추가 |
| `DeparturePrediction.tsx` | 소규모 변경 | 라벨에 commuteContext 반영 |
| `use-home-data.ts` | 소규모 변경 | `useTimeContext()` 결과 반환, `commuteContext` 추가 |
| `HomePage.tsx` | 소규모 변경 | commuteContext prop 전달, ArrivalEstimate 조건부 렌더링 |
| `weather-utils.tsx` | 변경 없음 | `getGreeting()`은 시간대 인사말로 독립 유지 |
| `home.css` | 추가 | arrival-estimate, evening-cta 스타일 추가 |

### 9. Backend 변경

**변경 없음.** 기존 인프라로 충분하다:

- `WidgetDataService.getData()`는 이미 `mode` 파라미터를 받아 `commute`/`return` 구분
- `BriefingAdviceService.getTimeContext()`는 이미 14시(KST) 기준 morning/evening 판정
- `CommuteRoute` entity는 이미 `routeType: 'evening'` 지원
- `totalExpectedDuration`은 이미 route 생성 시 계산되어 저장됨

PWA 프론트엔드는 이미 fetch한 route 데이터의 `totalExpectedDuration`과 `commuteStats`를 활용하여 도착 시간을 클라이언트 사이드에서 계산한다. 추가 API 엔드포인트 불필요.

### 10. DB Schema

**새로운 테이블 불필요.** 기존 `commute_routes` 테이블의 `route_type` 컬럼(`morning`/`evening`/`custom`)과 `total_expected_duration` 컬럼을 그대로 활용한다.

---

## Acceptance Criteria

### Must Have

```gherkin
AC-1: 14시 이후 자동 evening route 선택
Given 사용자가 morning route와 evening route를 모두 등록한 상태이고,
  현재 시각이 14시 이후이며 forceRouteType이 'auto'일 때,
When 홈 화면을 열면,
Then CommuteSection에 evening route의 정보(이름, 체크포인트, 교통정보)가 표시된다.

AC-2: 귀가 예상 도착 시간 표시 (route 기반)
Given 사용자의 evening route의 totalExpectedDuration이 45분이고,
  현재 시각이 18:30이며 commuteStats 기록이 3회 미만일 때,
When 홈 화면의 퇴근 모드를 볼 때,
Then "약 19:15 도착 예상" 텍스트가 표시된다.

AC-3: 귀가 예상 도착 시간 표시 (stats 기반)
Given 사용자의 commuteStats의 overallAverageDuration이 50분이고,
  totalSessions가 5회이며 현재 시각이 18:30일 때,
When 홈 화면의 퇴근 모드를 볼 때,
Then "19:20 도착 예상 (평균 기록 기반)" 텍스트가 표시된다.

AC-4: 출발 버튼 라벨 전환
Given 현재 시각이 14시 이후이고 evening route가 활성화된 상태일 때,
When CommuteSection을 볼 때,
Then 출발 버튼에 "퇴근 출발" 텍스트가 표시된다.

AC-5: 출발 버튼 라벨 유지 (오전)
Given 현재 시각이 14시 이전이고 morning route가 활성화된 상태일 때,
When CommuteSection을 볼 때,
Then 출발 버튼에 "출발하기" 텍스트가 표시된다.

AC-6: evening route 미등록 시 등록 유도
Given 사용자가 morning route만 등록하고 evening route가 없는 상태이며,
  현재 시각이 14시 이후일 때,
When 홈 화면을 볼 때,
Then "귀가 경로를 등록하면 도착 예상 시간을 알려드려요" CTA가 표시되고,
  경로 등록 링크가 /routes로 연결된다.

AC-7: route toggle 수동 전환 유지
Given 현재 시각이 9시(오전)이고 사용자가 route toggle에서 "퇴근"을 선택할 때,
When CommuteSection을 볼 때,
Then evening route 정보가 표시되고 버튼에 "퇴근 출발"이 표시된다.

AC-8: 도착 시간 없을 때 비표시
Given evening route의 totalExpectedDuration이 null이고 commuteStats도 없을 때,
When 홈 화면의 퇴근 모드를 볼 때,
Then ArrivalEstimate 컴포넌트가 렌더링되지 않는다 (에러 없음).

AC-9: BriefingSection 라벨 (기존 동작 확인)
Given 현재 시각이 14시 이후일 때,
When 홈 화면의 BriefingSection을 볼 때,
Then "퇴근 브리핑" 라벨이 표시된다.

AC-10: DeparturePrediction 라벨 전환
Given 퇴근 모드에서 DeparturePrediction이 표시될 때,
When prediction 컴포넌트를 볼 때,
Then "추천 퇴근 {시간}" 라벨이 표시된다.

AC-11: 접근성 - ArrivalEstimate
Given ArrivalEstimate가 렌더링될 때,
When 스크린 리더가 영역을 읽을 때,
Then "귀가 예상 도착 시간, 약 19시 15분" 형태의 aria-label이 제공된다.

AC-12: 빌드 통과
Given 모든 변경사항을 적용한 후,
When tsc --noEmit을 실행할 때,
Then 타입 에러 0개로 통과한다.

AC-13: 기존 테스트 통과
Given 모든 변경사항을 적용한 후,
When npm run test를 실행할 때,
Then 기존 테스트 + 신규 테스트 모두 통과한다.
```

### Should Have

```gherkin
AC-14: 홈 배경 색상 미세 변경
Given 현재 시각이 14시 이후일 때,
When 홈 페이지를 볼 때,
Then home-page에 --evening 색상 변수가 적용되어 cool tone 배경이 보인다.

AC-15: 전환 시 CSS transition
Given 사용자가 route toggle로 "출근" -> "퇴근"을 전환할 때,
When UI가 업데이트될 때,
Then 라벨과 색상이 300ms transition으로 부드럽게 전환된다.
```

---

## Task Breakdown

### Frontend Tasks

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| FE-1 | `useTimeContext()` 훅 구현 | S | none | `getTimeContext()` + `forceRouteType` 래핑. `CommuteContext` 타입 반환. `use-time-context.ts` |
| FE-2 | `useTimeContext()` 유닛 테스트 | S | FE-1 | forceRouteType별 반환값, 시간대별 라벨 검증. `use-time-context.test.ts` |
| FE-3 | `estimateArrivalTime()` 순수 함수 구현 | S | none | 현재 시각 + duration -> HH:MM 도착 시간 계산. `arrival-estimate-utils.ts` |
| FE-4 | `estimateArrivalTime()` 유닛 테스트 | S | FE-3 | stats 우선, route fallback, null 처리, 자정 넘김 케이스 등 10+ 케이스. `arrival-estimate-utils.test.ts` |
| FE-5 | `ArrivalEstimate` 컴포넌트 구현 | M | FE-3 | 귀가 예상 시간 카드. 아이콘 + 시간 + 상세 표시. `ArrivalEstimate.tsx` |
| FE-6 | `ArrivalEstimate` 컴포넌트 테스트 | S | FE-5 | 렌더링 검증, null 시 비표시, 접근성. `ArrivalEstimate.test.tsx` |
| FE-7 | `CommuteSection` 변경 | M | FE-1, FE-5 | 버튼 라벨 동적 변경, ArrivalEstimate 통합, evening CTA 추가 |
| FE-8 | `DeparturePrediction` 라벨 변경 | XS | FE-1 | isEveningCommute에 따른 "추천 출발" / "추천 퇴근" 전환 |
| FE-9 | `use-home-data.ts` 확장 | S | FE-1 | `commuteContext` 반환값 추가, `UseHomeDataReturn` 인터페이스 확장 |
| FE-10 | `HomePage.tsx` 통합 | S | FE-7, FE-9 | commuteContext를 CommuteSection, DeparturePrediction에 전달 |
| FE-11 | CSS 추가 | S | FE-5, FE-7 | arrival-estimate, evening-cta 스타일. `home.css` 수정 |
| FE-12 | 빌드 검증 + lint | XS | FE-10 | `tsc --noEmit && npm run lint && npm run test && npm run build` 전체 통과 확인 |

### Backend Tasks

| # | Task | Size | Deps | Description |
|---|------|------|------|-------------|
| (없음) | - | - | - | Backend 변경 불필요 |

### 의존성 그래프

```
FE-1 ── FE-2   (useTimeContext 훅 + 테스트)
  |
  ├─── FE-7   (CommuteSection 변경 — FE-5도 필요)
  ├─── FE-8   (DeparturePrediction 라벨)
  └─── FE-9   (use-home-data 확장)

FE-3 ── FE-4   (estimateArrivalTime + 테스트)
  |
  └─── FE-5 ── FE-6   (ArrivalEstimate 컴포넌트 + 테스트)
         |
         └─── FE-7   (CommuteSection에 통합)

FE-7 + FE-9 ── FE-10 ── FE-11 ── FE-12  (통합 + 스타일 + 검증)
```

**병렬 가능:**
- FE-1~FE-2 (훅)과 FE-3~FE-4 (함수) 병렬 진행 가능
- FE-5~FE-6 (ArrivalEstimate)과 FE-8 (DeparturePrediction) 병렬 가능

**예상 소요:** 총 4~6시간 (1인 기준 0.5~0.75일)

---

## Existing Code Reuse Map

| 재사용 대상 | 위치 | 활용 방식 |
|------------|------|----------|
| `getTimeContext()` | `frontend/.../home/build-briefing.ts` | `useTimeContext()` 훅의 내부 로직으로 호출 |
| `getActiveRoute()` | `frontend/.../home/route-utils.ts` | 14시 기준 evening route 선택 (기존 그대로) |
| `RouteResponse.totalExpectedDuration` | `frontend/.../api/commute-api.client.ts` | 귀가 예상 시간 계산의 fallback 소스 |
| `CommuteStatsResponse.overallAverageDuration` | `frontend/.../api/commute-api.client.ts` | 귀가 예상 시간 계산의 primary 소스 |
| `CommuteSection` route toggle | `frontend/.../home/CommuteSection.tsx` | 기존 자동/출근/퇴근 토글 그대로 유지 |
| `BriefingSection` timeContext | `frontend/.../home/BriefingSection.tsx` | 이미 구현된 라벨 전환 재확인만 |
| `MorningBriefing` context | `frontend/.../home/MorningBriefing.tsx` | 이미 구현된 라벨/스타일 전환 재확인만 |
| BE `BriefingAdviceService.getTimeContext()` | `backend/.../services/briefing-advice.service.ts` | 참조만 (FE와 동일 로직 확인용) |
| BE `WidgetDataService.getData(mode)` | `backend/.../services/widget-data.service.ts` | 현재 변경 불필요, 향후 widget 연동 시 mode 활용 |

---

## Decision Log

| Date | Decision | Alternatives Considered | Rationale |
|------|----------|------------------------|-----------| 
| 2026-02-26 | 14시 기준 유지 (route-utils), 12시 기준 유지 (briefing) | 전부 14시로 통일 | 12~14시 사이에 "퇴근 브리핑" 라벨이 뜨되 경로는 출근인 것이 자연스럽다 (점심시간에 아직 사무실). 기존 동작 변경 최소화 |
| 2026-02-26 | 도착 시간 클라이언트 사이드 계산 | BE API 엔드포인트 추가 | PWA는 이미 route + stats 데이터를 보유. 추가 API 호출은 불필요한 네트워크 비용. 실시간 교통 반영은 P3-1(ML) 범위 |
| 2026-02-26 | commuteStats 우선, totalExpectedDuration fallback | totalExpectedDuration만 사용 | 실측 데이터(3회 이상)가 설정 값보다 정확. 경로 설정의 expectedDuration은 사용자가 대략 입력한 값이므로 보조적 |
| 2026-02-26 | evening route 없을 때 CTA 표시 (morning route 유지) | morning route 숨기기 | 퇴근 시에도 출근 경로 역방향으로 귀가하는 사용자 있음. 기존 정보를 숨기지 않고 CTA만 추가 |
| 2026-02-26 | Backend 변경 없음 | estimatedArrivalTime API 추가 | 현재 단계에서 정적 계산으로 충분. 교통 상황 반영 예측은 P3-1 ML 범위에서 BE 변경 예정 |
| 2026-02-26 | 버튼 라벨만 변경 (기능은 동일) | 별도 "퇴근 출발" 플로우 추가 | 세션 시작 로직은 morning/evening 구분 없이 동일 (routeId 기반). 라벨만 맥락에 맞추면 충분 |

---

## Out of Scope

- **Backend 변경 없음** -- 기존 route/stats API, widget API, BriefingAdviceService 모두 이미 evening 지원. PWA 프론트엔드 변경만 다룬다.
- **실시간 교통 기반 도착 예측** -- P3-1 ML 범위. 이 스펙에서는 정적 duration 기반 계산.
- **대안 경로 제시** -- P3-5 별도 항목.
- **퇴근 알림 (push notification)** -- 기존 EventBridge 알림 설정에서 사용자가 직접 퇴근 시간 알림을 설정 가능. 자동 퇴근 알림은 이 스펙 범위 밖.
- **위치 기반 자동 전환** -- P2-1 Geofence는 네이티브 앱 전용. PWA에서는 시간 기반만 사용.
- **다크 모드 퇴근 테마** -- 앱인토스 가이드라인에 따라 다크모드 미지원.
- **E2E 테스트** -- 유닛 + 컴포넌트 테스트로 커버. E2E는 Phase 완료 후 일괄 추가.
- **MorningBriefing 컴포넌트 이름 변경** -- 기능적 변경 없이 이름만 바꾸는 것은 리팩토링 범위. 기존 이름 유지.

---

## Open Questions (Resolved)

| # | Question | Resolution |
|---|----------|-----------| 
| 1 | 12시와 14시로 분리된 전환 시점을 통일해야 하나? | 유지. 12시~14시 사이에 "퇴근 브리핑" 라벨이 보이지만 경로는 출근인 것이 자연스러움 (점심시간). 사용자 혼란 최소화 |
| 2 | totalExpectedDuration이 없는 route가 있을 수 있나? | 있을 수 있다. route 생성 시 체크포인트의 expectedDuration 합산이므로, 체크포인트에 duration을 입력하지 않으면 undefined. 이 경우 ArrivalEstimate 비표시 |
| 3 | 퇴근 모드에서 출근 stats를 보여야 하나? | StatsSection은 전체 통근 통계이므로 morning/evening 구분 없이 유지. 향후 P3-4(리포트)에서 분리 가능 |
| 4 | evening route 없이 morning route만 있을 때 역방향으로 사용할 수 있나? | 가능하다. morning route가 활성화된 상태로 "퇴근 출발" 버튼을 눌러 세션을 시작할 수 있음. 별도 역방향 기능은 이 스펙 범위 밖 |

---

*Spec by PM Agent | P2-4 | 2026-02-26*
