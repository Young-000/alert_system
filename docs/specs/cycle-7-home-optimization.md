# Cycle 7: Home Page Cognitive Load Reduction

> Spec 작성: 2026-02-17
> 대상 아이템: N-11 (RICE 80) + Cycle 6 PD P2/P3 후속 개선
> 노력 추정: L (1 cycle)

---

## JTBD

When **출퇴근 직장인이 아침에 홈 화면을 열었을 때**, I want to **핵심 정보(날씨, 경로, 출발 버튼)를 즉시 파악하고**, so I can **3초 이내에 출발 결정을 내릴 수 있다.**

---

## Problem

- **Who:** 매일 아침 앱을 여는 출퇴근 직장인 (전체 사용자 100%)
- **Pain:** 높음 (매일 1~2회 반복 x 높은 인지 부하). 홈 화면에 9개 섹션이 나열되어 핵심 CTA("출발하기")까지 스크롤이 필요하고, 어떤 정보를 먼저 봐야 할지 판단에 시간이 걸린다.
- **Current workaround:** 사용자가 불필요한 섹션을 무시하고 스크롤하여 출발 버튼을 찾음. 반복 사용자는 날씨/체크리스트를 건너뛰는 패턴이 형성됨.
- **Success metric:** 홈 화면의 가시 섹션 수가 최대 5개 이하로 줄어들고, "출발하기" 버튼이 첫 뷰포트(667px 기준) 내에 위치한다.

### 근거

UX 리뷰(Cycle 1, H-1)에서 Miller's Law 위반으로 식별:

> "한 화면에 9개 섹션: 인사, 날씨, 체크리스트, 출발예측, 경로추천, 출퇴근카드, 알림, 통계, 다른경로. 인지 부하 높음."

현재 섹션 목록 (로그인 사용자, 모든 데이터 있는 경우):

| # | 섹션 | 컴포넌트 | 항상 표시 | 높이(추정) |
|---|------|----------|:---------:|:----------:|
| 1 | 인사말 헤더 | `home-header` | O | ~60px |
| 2 | 날씨 히어로 | `WeatherHeroSection` | O | ~120px |
| 3 | 준비물 체크리스트 | (WeatherHeroSection 내부) | 조건부 | ~60px |
| 4 | 추천 출발 시간 | `DeparturePrediction` | 조건부 | ~50px |
| 5 | 경로 추천 배너 | `RouteRecommendation` | 조건부 | ~50px |
| 6 | 출퇴근 카드 (경로+교통+CTA) | `CommuteSection` | O | ~250px |
| 7 | 알림 바 | `AlertSection` | O | ~50px |
| 8 | 이번 주 통계 | `StatsSection` | O | ~120px |
| 9 | 다른 경로 칩 | (StatsSection 내부) | 조건부 | ~50px |

**총 스크롤 높이 (최대 시):** ~810px. iPhone SE(667px 뷰포트)에서 "출발하기" 버튼은 스크롤 아래에 위치.

---

## Solution

### Overview

홈 화면의 정보 계층을 재구성하여, **핵심 액션(출발하기)을 최상단에 가깝게 배치**하고 보조 정보(통계, 날씨 상세)는 접을 수 있게 만든다. 섹션 삭제가 아닌 **축약/접기**로 정보 손실 없이 인지 부하를 줄인다.

### 핵심 전략

1. **날씨 + 출퇴근 카드 통합**: 날씨 히어로를 축약하여 출퇴근 카드 상단에 한 줄 날씨 요약으로 배치. 탭하면 상세 펼침.
2. **통계 섹션 접기**: 기본 접힌 상태로 표시. "이번 주 >"로 펼치기 가능.
3. **섹션 순서 최적화**: 인사 > (축약)날씨+출퇴근카드 > 알림 > 통계(접힘). 출발 버튼이 첫 화면에 보이도록.

### User Flow

1. 사용자가 홈 화면 진입
2. 인사말 + 축약 날씨(온도+상태 한 줄) + 출퇴근 카드("출발하기" 포함)가 첫 뷰포트에 보임
3. 날씨 한 줄 요약을 탭 → 상세(습도, 미세먼지, 체크리스트) 펼침/접기 토글
4. 스크롤 하단에 알림 바 + 접힌 통계
5. 통계 "이번 주 >" 탭 → 통계 상세 펼침

```
변경 전 (9섹션 나열):              변경 후 (5섹션, 축약/접기):
┌─────────────────────┐           ┌─────────────────────┐
│ 인사말               │           │ 인사말               │
├─────────────────────┤           ├─────────────────────┤
│ 날씨 히어로 (큰 카드) │           │ 22° 맑음 미세먼지 좋음 ▼│ ← 한 줄 요약 (탭으로 펼침)
├─────────────────────┤           ├─────────────────────┤
│ 준비물 체크리스트      │           │ 출퇴근 카드           │
├─────────────────────┤           │  경로 + 교통 + 출발    │
│ 출발 예측             │           │  (+ 출발예측/경로추천)  │
├─────────────────────┤           ├─────────────────────┤
│ 경로 추천 배너        │           │ 알림 바               │
├─────────────────────┤           ├─────────────────────┤
│ 출퇴근 카드           │           │ 이번 주 통계    ▶     │ ← 접힌 상태
│  (경로+교통+출발)     │           └─────────────────────┘
├─────────────────────┤              (뷰포트 667px 이내)
│ 알림 바              │
├─────────────────────┤
│ 이번 주 통계          │
├─────────────────────┤
│ 다른 경로 칩          │
└─────────────────────┘
  (~810px, 스크롤 필요)
```

---

## Scope (MoSCoW)

### Must have

1. **날씨 축약 모드**: WeatherHeroSection을 한 줄 요약 모드(온도 + 상태 + 미세먼지 뱃지)로 기본 표시. 탭하면 상세(습도, 어드바이스, 체크리스트) 펼침.
2. **통계 섹션 접기**: StatsSection을 기본 접힌 상태("이번 주 평균 32분 | 3회 ▶")로 표시. 탭으로 펼침.
3. **섹션 순서 유지**: 현재 순서(날씨 > 출퇴근 > 알림 > 통계)를 유지하되, 축약으로 높이를 줄인다.
4. **접기 상태 유지**: `localStorage`에 펼침/접힘 상태를 저장하여 재방문 시 유지.
5. **기존 테스트 유지**: HomePage.test.tsx 및 관련 유닛 테스트(weather-utils, route-utils, alert-schedule-utils, cron-utils)가 모두 통과해야 한다.

### Should have

6. **DeparturePrediction/RouteRecommendation을 CommuteSection 내부로 이동**: 출퇴근 카드 내에 인라인으로 표시하여 독립 섹션 수를 줄인다.
7. **접기/펼치기 애니메이션**: `max-height` + `transition` 또는 CSS `details/summary`로 부드러운 토글.
8. **"다른 경로" 칩을 CommuteSection 하단에 통합**: StatsSection에서 분리하여 경로 카드 근처에 배치.

### Could have

9. **날씨 축약 시 아이콘 크기 축소**: 48px → 24px 아이콘으로 컴팩트 표시.
10. **Cycle 6 PD P2 후속: 뱃지 터치 타겟 44px 보장** ("서울 기준" 뱃지).

### Won't have (this cycle)

- 홈 섹션 드래그앤드롭 재배치 (사용자별 커스텀 순서)
- "출발하기" sticky bottom CTA (H-5, 별도 사이클에서 검토)
- 홈 페이지 풀 리디자인 / 레이아웃 변경
- 날씨 카드 삭제 (축약만, 삭제하지 않음)

---

## Acceptance Criteria

### AC-1: 날씨 축약 모드 (기본)

- [ ] Given 로그인 사용자가 홈 화면에 진입했을 때, When 날씨 데이터가 로드되면, Then 날씨는 한 줄 요약으로 표시된다 (온도 + 상태명 + 미세먼지 뱃지). 상세(습도, 어드바이스, 체크리스트)는 숨겨진다.
- [ ] Given 날씨가 축약 상태일 때, When 사용자가 날씨 요약 영역을 탭하면, Then 상세 정보(습도, 미세먼지 수치, 어드바이스 텍스트, 준비물 체크리스트)가 펼쳐진다.
- [ ] Given 날씨가 펼쳐진 상태일 때, When 사용자가 다시 탭하면, Then 상세 정보가 접힌다.
- [ ] Given 날씨 축약/펼침 상태가 변경되었을 때, Then `localStorage`에 상태가 저장되고, 페이지 재방문 시 마지막 상태가 복원된다.

### AC-2: 통계 섹션 접기 (기본)

- [ ] Given 로그인 사용자가 홈 화면에 진입했을 때, Then 통계 섹션은 기본적으로 접힌 상태로 표시된다. 접힌 상태에서는 한 줄 요약("이번 주 평균 Xmin | Y회")과 펼치기 인디케이터(chevron 아이콘)를 보여준다.
- [ ] Given 통계가 접힌 상태일 때, When 사용자가 통계 요약 행을 탭하면, Then 상세 통계(평균/횟수 카드, 인사이트, "자세히 보기" 링크)가 펼쳐진다.
- [ ] Given 통계가 펼쳐진 상태일 때, When 사용자가 다시 탭하면, Then 상세가 접힌다.
- [ ] Given 통계 데이터가 없을 때(빈 상태), Then 접힌 요약은 "이번 주 출퇴근 기록 없음"으로 표시되고, 펼치면 기존 빈 상태 메시지 + 대시보드 링크가 보인다.
- [ ] Given 통계 접기/펼침 상태가 변경되었을 때, Then `localStorage`에 상태가 저장된다.

### AC-3: 뷰포트 내 출발 버튼

- [ ] Given 모든 데이터가 로드된 상태(날씨, 경로, 교통, 알림, 통계 모두 있음)에서, When 날씨가 축약 상태이고 통계가 접힌 상태이면, Then "출발하기" 버튼이 iPhone SE 뷰포트(375x667px) 내에서 스크롤 없이 보인다.

### AC-4: 접근성

- [ ] Given 접기/펼치기 토글 버튼에, Then `aria-expanded` 속성이 현재 상태(true/false)를 반영한다.
- [ ] Given 스크린리더 사용자가 접힌 섹션을 탐색할 때, Then 토글 버튼에 `aria-label`이 "날씨 상세 펼치기" / "날씨 상세 접기" 등으로 상태를 안내한다.
- [ ] Given 접기/펼치기 컨트롤이, Then 키보드(Enter/Space)로 조작 가능하다.

### AC-5: 기존 기능 보존

- [ ] Given 날씨 펼침 상태에서, Then 기존 WeatherHeroSection의 모든 기능(온도, 상태, 습도, 미세먼지, 어드바이스, 체크리스트 토글, "서울 기준" 뱃지)이 동일하게 작동한다.
- [ ] Given 통계 펼침 상태에서, Then 기존 StatsSection의 모든 기능(평균, 횟수, 인사이트, "자세히 보기" 링크, "다른 경로" 칩)이 동일하게 작동한다.
- [ ] Given 전체 프론트엔드 테스트 스위트 실행 시, Then 기존 143개 테스트가 모두 통과한다.

### AC-6: 빌드 & 린트

- [ ] `npm run lint` -- 에러 0개
- [ ] `npm run typecheck` -- 에러 0개
- [ ] `npm run build` -- 성공
- [ ] `npm run test` -- 전체 통과

---

## Task Breakdown

### Task 1: `useCollapsible` 공유 훅 생성 — S — Deps: none

**파일:** `frontend/src/presentation/hooks/useCollapsible.ts`

접기/펼치기 상태 관리 + localStorage 영속 훅.

```typescript
interface UseCollapsibleOptions {
  storageKey: string;
  defaultExpanded?: boolean;
}

interface UseCollapsibleReturn {
  isExpanded: boolean;
  toggle: () => void;
  ariaProps: {
    'aria-expanded': boolean;
    role: 'button';
    tabIndex: 0;
    onKeyDown: (e: KeyboardEvent) => void;
    onClick: () => void;
  };
}
```

- `localStorage` key format: `home_collapsible_{section}`
- 키보드 지원: Enter/Space로 토글
- `aria-expanded` 자동 관리

### Task 2: `useCollapsible` 테스트 — S — Deps: Task 1

**파일:** `frontend/src/presentation/hooks/useCollapsible.test.ts`

테스트 케이스:
- 기본 상태가 `defaultExpanded` 파라미터와 일치하는지
- `toggle()` 호출 시 상태 반전
- `localStorage`에 상태 저장/복원
- `ariaProps`의 `aria-expanded` 값이 상태와 동기화
- Enter/Space 키 이벤트로 토글 동작

### Task 3: WeatherHeroSection 축약 모드 구현 — M — Deps: Task 1

**파일:** `frontend/src/presentation/pages/home/WeatherHeroSection.tsx`

변경 내용:
- `useCollapsible({ storageKey: 'weather', defaultExpanded: false })` 사용
- 접힌 상태: 온도 + 상태명 + 미세먼지 뱃지 + chevron을 한 줄 레이아웃으로 표시
- 펼친 상태: 기존 전체 레이아웃(습도, 어드바이스, 체크리스트) 유지
- 접힌 상태의 컨테이너: 기존 `.weather-hero` 배경 유지하되 padding 축소
- Props 변경 없음 (내부 상태로 관리)

### Task 4: WeatherHeroSection CSS 추가 — S — Deps: Task 3

**파일:** `frontend/src/presentation/styles/pages/home.css`

추가할 클래스:
- `.weather-hero--collapsed`: 축약 모드 스타일 (한 줄, padding 12px, flex row)
- `.weather-hero-summary`: 축약 모드의 한 줄 레이아웃
- `.weather-hero-chevron`: 펼침 인디케이터 (transform rotate)
- `.weather-hero-detail`: 상세 영역 (펼침 시 표시)
- 접기/펼치기 transition: `max-height`, `opacity` 조합

### Task 5: StatsSection 접기 모드 구현 — M — Deps: Task 1

**파일:** `frontend/src/presentation/pages/home/StatsSection.tsx`

변경 내용:
- `useCollapsible({ storageKey: 'stats', defaultExpanded: false })` 사용
- 접힌 상태: "이번 주" 타이틀 + 한 줄 요약(평균 X분 | Y회) + chevron
- 펼친 상태: 기존 전체 레이아웃
- "다른 경로" 칩은 접힌/펼친 상태와 무관하게 항상 표시
- 빈 상태일 때 접힌 요약: "이번 주 출퇴근 기록 없음"

### Task 6: StatsSection CSS 추가 — S — Deps: Task 5

**파일:** `frontend/src/presentation/styles/pages/home.css`

추가할 클래스:
- `.home-stats--collapsed`: 접힌 상태 스타일
- `.home-stats-summary-row`: 접힌 상태 한 줄 요약 (flex row, 클릭 가능)
- `.home-stats-chevron`: 펼침 인디케이터
- `.home-stats-detail`: 상세 영역 (펼침 시 표시)

### Task 7: HomePage 레이아웃 조정 — S — Deps: Task 3, Task 5

**파일:** `frontend/src/presentation/pages/home/HomePage.tsx`

변경 내용:
- WeatherHeroSection, StatsSection 프롭 변경 없음 (각 컴포넌트가 내부적으로 축약 관리)
- 인라인 스타일 스켈레톤(`style={{ width, height }}`) 제거 → CSS 클래스로 교체 (PD H-3 후속)
- Should-have 시간 있으면: DeparturePrediction, RouteRecommendation을 CommuteSection 위가 아닌 내부로 이동

### Task 8: 기존 테스트 수정 & 신규 테스트 — M — Deps: Task 3, Task 5, Task 7

**파일:**
- `frontend/src/presentation/pages/home/HomePage.test.tsx` (기존 테스트 통과 확인)
- `frontend/src/presentation/hooks/useCollapsible.test.ts` (Task 2)

추가 테스트:
- WeatherHeroSection: 축약 모드 렌더링, 펼침 클릭, 체크리스트 동작 보존
- StatsSection: 접힌 상태 렌더링, 펼침 클릭, 빈 상태
- 통합: 전체 143개 테스트 통과 확인

### Task 9: 빌드 검증 & 최종 체크 — S — Deps: Task 8

- `npm run lint` 통과
- `npm run typecheck` 통과
- `npm run build` 성공
- `npm run test` 전체 통과
- 수동 확인: 축약 상태에서 iPhone SE 뷰포트 시뮬레이션으로 "출발하기" 버튼 가시성 확인

---

## File Impact Summary

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `frontend/src/presentation/hooks/useCollapsible.ts` | **신규** | 접기/펼치기 공유 훅 |
| `frontend/src/presentation/hooks/useCollapsible.test.ts` | **신규** | 훅 테스트 |
| `frontend/src/presentation/pages/home/WeatherHeroSection.tsx` | 수정 | 축약 모드 추가 |
| `frontend/src/presentation/pages/home/StatsSection.tsx` | 수정 | 접기 모드 추가 |
| `frontend/src/presentation/pages/home/HomePage.tsx` | 수정 | 스켈레톤 인라인 스타일 정리 |
| `frontend/src/presentation/styles/pages/home.css` | 수정 | 축약/접기 CSS 추가 |
| `frontend/src/presentation/pages/home/HomePage.test.tsx` | 수정 | 테스트 유지/보강 |

**예상 변경량:** 신규 2파일 (~120줄) + 수정 5파일 (~200줄 변경)

---

## Technical Notes

### localStorage Key Convention

```
home_collapsible_weather   → "true" | "false"
home_collapsible_stats     → "true" | "false"
```

기존 `checklist_checked` 키와 충돌 없음 (네임스페이스 `home_collapsible_` 사용).

### 접기/펼치기 애니메이션 구현

CSS `transition` + `max-height` 패턴 권장:

```css
.collapsible-content {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.3s ease, opacity 0.2s ease;
}

.collapsible-content--expanded {
  max-height: 500px; /* 충분히 큰 값 */
  opacity: 1;
}
```

`<details>`/`<summary>` 네이티브 HTML도 고려하되, 애니메이션 커스터마이징이 제한적이므로 CSS transition 방식 추천.

### prefers-reduced-motion 대응

```css
@media (prefers-reduced-motion: reduce) {
  .collapsible-content {
    transition: none;
  }
}
```

기존 프로젝트에 `prefers-reduced-motion` 지원이 있으므로 이와 일관되게 적용.

---

## Open Questions

1. **날씨 축약 기본값**: 처음 방문 시 축약(접힌) 상태가 기본인데, 신규 사용자가 날씨 상세를 놓칠 수 있다. 첫 방문 시에만 펼침으로 시작하고, 이후 접힘을 기본으로 할지? → **결정: localStorage에 키가 없으면 접힘이 기본. 간단한 규칙 우선.**
2. **"다른 경로" 칩 위치**: 현재 StatsSection 내부에 있는데, CommuteSection 하단으로 이동하는 게 IA적으로 맞음. Should-have로 분류했으나, StatsSection이 접히면 "다른 경로"도 숨겨진다. → **결정: "다른 경로" 칩은 StatsSection 밖으로 분리하여 항상 보이게. Task 5에서 처리.**

---

## Out of Scope

- **Sticky "출발하기" 버튼 (H-5)**: 축약/접기로 뷰포트 문제가 해결되면 불필요. 해결 안 되면 별도 사이클.
- **섹션 순서 변경**: 기존 순서(날씨 > 출퇴근 > 알림 > 통계)를 유지. 사용자별 커스텀 순서는 미구현.
- **홈 대시보드화**: 탭/카드 레이아웃 등 근본적 리디자인은 하지 않는다.
- **N-1 (Jest -> Vitest)**: RICE 40이지만 이 사이클에서는 범위 밖. 코드 변경이 순수 프론트엔드이므로 기존 Jest로 테스트 작성.

---

## Definition of Done

1. 날씨 섹션이 기본 축약(한 줄)으로 표시되고, 탭으로 펼침/접힘 토글 가능
2. 통계 섹션이 기본 접힌 상태로 표시되고, 탭으로 펼침/접힘 토글 가능
3. 접기/펼치기 상태가 `localStorage`에 영속됨
4. 모든 접기/펼치기 컨트롤에 `aria-expanded` + 키보드 지원
5. 축약+접힘 상태에서 "출발하기" 버튼이 iPhone SE 뷰포트(375x667) 내 가시
6. 기존 모든 기능(날씨, 체크리스트, 교통, 통계)이 펼침 상태에서 동일 작동
7. `lint` + `typecheck` + `build` + `test(143+)` 전체 통과
8. PR 생성 + 머지 + Vercel 배포 완료 + 배포 사이트 검증

---

*Spec: PM Agent (Cycle 7) | 다음: Dev 구현 → QA 검증 → PD UX 리뷰*
