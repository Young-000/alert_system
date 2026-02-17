# F-1: 오늘의 출근 브리핑 위젯

> 작성: Cycle 13 PM
> RICE: 120
> 노력: 2 사이클

---

## 문제

홈 화면에 날씨, 교통, 경로, 알림, 통계 등 많은 정보가 각각 분리되어 있어서 사용자가 "오늘 출퇴근에 필요한 핵심 정보"를 한눈에 파악하기 어렵다. 사용자가 아침에 앱을 열었을 때 가장 먼저 보고 싶은 것은 "지금 출발하면 어떻게 되나?"를 요약한 한 줄이다.

## 솔루션

시간대 인식 브리핑 카드를 홈 화면 상단(인사말 아래, 날씨 섹션 위)에 배치한다. 이 카드는 현재 시간에 따라 출근/퇴근 맥락을 자동으로 판단하고, 날씨 + 교통 + 소요시간을 한 줄로 요약한다.

## 수용 기준 (Acceptance Criteria)

### AC-1: 시간대별 인사말 맥락
- 06:00-11:59: 출근 브리핑 (출근 경로 기준)
- 12:00-17:59: 퇴근 브리핑 (퇴근 경로 기준)
- 18:00-05:59: 내일 출근 브리핑 (출근 경로 기준, "내일" 접두어)

### AC-2: 브리핑 내용 구성
카드에 다음 정보를 한 줄 + 부제 형태로 표시:
- **메인 라인**: "{날씨이모지} {온도}° · {미세먼지} · {소요시간}분 예상"
- **서브 라인**: 가장 빠른 교통 도착 정보 또는 경로 이름
- 데이터가 없는 항목은 graceful degradation (건너뜀)

### AC-3: 데이터 의존성
- 날씨 데이터 없음 → 날씨 부분 생략, 교통/경로만 표시
- 경로 없음 → 브리핑 카드 자체를 숨김 (경로가 있어야 의미)
- 교통 정보 없음 → 소요시간만 표시
- 통계 데이터 없음 → "소요시간 예상" 부분 생략

### AC-4: 순수 함수로 구현
- `buildBriefing(...)` 순수 함수로 브리핑 텍스트 생성
- useHomeData에서 이미 제공하는 데이터만 사용 (새 API 호출 없음)
- 테스트 가능한 순수 로직

### AC-5: 접근성
- `aria-label`로 전체 브리핑 텍스트를 스크린 리더에 제공
- 색상만으로 정보 전달하지 않음

### AC-6: 스타일
- 기존 `.today-card` 스타일과 조화
- 배경색: 시간대별 미묘한 그라데이션 (아침: warm, 저녁: cool)
- 한 줄 요약이므로 높이 최소화 (패딩 포함 ~56px)

## 구현 단계

### Step 1: 순수 함수 `build-briefing.ts`
- `getTimeContext()` → 'morning' | 'evening' | 'tomorrow'
- `buildBriefingLine(context, weather, airQuality, stats, transitInfos)` → { main, sub, ariaLabel }

### Step 2: `MorningBriefing.tsx` 컴포넌트
- Props: weather, airQuality, commuteStats, transitInfos, activeRoute
- 경로 없으면 null 반환
- buildBriefingLine 호출 → 렌더링

### Step 3: `HomePage.tsx` 통합
- WeatherHeroSection 위에 MorningBriefing 배치

### Step 4: CSS + 테스트
- `home.css`에 스타일 추가
- `build-briefing.test.ts` 순수 함수 테스트

## 비구현 (Non-goals)
- 새 API 엔드포인트 호출
- 백엔드 변경
- 경로/교통 데이터의 새로운 가공 (기존 데이터 재사용)
