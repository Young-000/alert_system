# Cycle 13 UX/Accessibility Review

**검토 대상**: F-3 (Live Transit Auto-refresh) + F-1 (Morning Briefing Widget)
**검토일**: 2026-02-17
**검토자**: PD Agent

---

## 전반적 평가

**종합 평가: APPROVE WITH CONDITIONS (조건부 승인)**

두 기능 모두 UX 의도는 명확하고, 코드 구현이 깔끔하나, **색상 접근성** 및 **정보 전달 방식**에서 WCAG AA 기준 미달 위험이 있습니다. 아래 우선순위 이슈를 해결 후 배포 권장합니다.

---

## 이슈 목록

### P0: 배포 차단 이슈 (Critical Blocker)

#### P0-1: Gradient Background 색상 대비 미달

**컴포넌트**: `MorningBriefing.tsx` + `home.css` (.morning-briefing)

**문제**:
```css
.morning-briefing--morning {
  background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
  border-color: #fde68a;
}
```
- `.morning-briefing-main` (검정 텍스트 #1e293b) on 노란 gradient 배경 → 대비율 **약 3.8:1** (AA 기준 4.5:1 미만)
- `.morning-briefing-sub` (회색 텍스트 #475569) on 같은 배경 → 대비율 **약 2.9:1** (심각한 미달)

**WCAG 위반**: WCAG 2.1 Level AA - 1.4.3 Contrast (Minimum)

**제안 해결책**:
```css
/* 방법 1: 텍스트를 더 진한 색으로 */
.morning-briefing-main {
  color: #0f172a; /* 더 진한 검정, 대비율 5.2:1 */
}
.morning-briefing-sub {
  color: #334155; /* 더 진한 회색, 대비율 4.7:1 */
}

/* 방법 2: 배경을 더 진한 색으로 (권장) */
.morning-briefing--morning {
  background: linear-gradient(135deg, #fde047 0%, #fef08a 100%);
  /* 더 진한 노란색, 검정 텍스트 대비율 6.1:1 */
}
```

**우선 검증 필요**: 실제 렌더링 후 WebAIM Contrast Checker로 측정 권장.

---

#### P0-2: `.arriving-soon` 색상만으로 정보 전달

**컴포넌트**: `CommuteSection.tsx` + `home.css` (.arriving-soon-text)

**문제**:
```tsx
<span className={`today-transit-time${arrivingSoon ? ' arriving-soon-text' : ''}`}>
  {arrivalTime > 0 ? `${arrivalTime}분` : '곧 도착'}
</span>
```
```css
.arriving-soon-text {
  color: var(--error, #ef4444) !important;
  font-weight: 700 !important;
  animation: pulse-text 2s ease-in-out infinite;
}
```

- **빨간색**만으로 긴급성 전달 → 색맹 사용자 구별 불가
- `animation: pulse-text` → 시각적 강조만 존재

**WCAG 위반**: 1.4.1 Use of Color

**제안 해결책**:
```tsx
// 아이콘 추가로 시각적 단서 제공
{arrivingSoon && <span className="urgent-icon" aria-hidden="true">⚡</span>}
<span className={`today-transit-time${arrivingSoon ? ' arriving-soon-text' : ''}`}>
  {arrivalTime > 0 ? `${arrivalTime}분` : '곧 도착'}
</span>
```
또는
```css
/* 빨간색 + 밑줄/테두리로 이중 시각 단서 */
.arriving-soon-text {
  color: var(--error);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: currentColor;
  text-decoration-thickness: 2px;
}
```

---

### P1: 배포 전 필수 수정 (Must Fix)

#### P1-1: 스크린 리더 실시간 갱신 미지원

**컴포넌트**: `CommuteSection.tsx`

**문제**:
```tsx
<div className="today-transit" aria-live="polite">
```
- `aria-live="polite"`는 설정했으나, 실제로 **내용 변경 시 announce 없음**
- 갱신 시간 표시(`formatRelativeTime`)가 텍스트만 변경 → 스크린 리더가 읽지 않을 가능성

**제안 해결책**:
```tsx
// 갱신 완료 시 visually-hidden 텍스트로 알림
{isTransitRefreshing && <span className="sr-only">교통정보 갱신 중</span>}
{!isTransitRefreshing && lastTransitUpdate && (
  <span className="sr-only">
    교통정보 {formatRelativeTime(lastTransitUpdate)} 업데이트됨
  </span>
)}
```

---

#### P1-2: Morning Briefing 축약 정보 누락

**컴포넌트**: `build-briefing.ts`

**문제**:
```ts
// 현재 로직: 날씨 + 미세먼지 + 시간 예상 → 3개 요소 조합
const main = parts.join(' · ');
```
- 만약 `weather === null` + `airQuality === '-'` → **main이 "약 45분 예상"만 표시**
- 시각적으로 정보가 빈약해 보임 → 사용자가 "브리핑이 제대로 안 떴나?" 혼란

**제안 해결책**:
```ts
// main이 너무 짧으면 briefing 자체를 숨기거나, 최소 정보 보장
if (parts.length === 0 || (parts.length === 1 && !weather)) {
  return null; // 의미 있는 브리핑이 아니면 아예 숨김
}
```

---

#### P1-3: 키보드 접근성 - Collapsible 없음

**컴포넌트**: `MorningBriefing.tsx`

**문제**:
- Morning Briefing 카드가 **정적 표시만** 가능
- 날씨 카드/통계 카드는 접기/펼치기 UI 있으나, Briefing은 항상 표시
- 모바일에서 화면 공간 많이 차지 → 스크롤 피로도 증가

**제안 해결책**:
```tsx
// 접기/펼치기 추가 (선택사항)
const [isExpanded, setIsExpanded] = useState(true);
return (
  <section className="morning-briefing" onClick={() => setIsExpanded(!isExpanded)}>
    <p className="morning-briefing-main">{briefing.main}</p>
    {isExpanded && <p className="morning-briefing-sub">{briefing.sub}</p>}
  </section>
);
```
단, 현재 카드 크기가 작으므로 **P2로 강등 가능**.

---

### P2: 개선 권장 (Should Fix)

#### P2-1: `aria-label` 중복 사용

**컴포넌트**: `MorningBriefing.tsx`

**문제**:
```tsx
<section className="morning-briefing" aria-label={briefing.ariaLabel}>
  <span className="morning-briefing-label">{briefing.contextLabel}</span>
  <p className="morning-briefing-main">{briefing.main}</p>
  <p className="morning-briefing-sub">{briefing.sub}</p>
</section>
```
- `aria-label="출근 브리핑. ☀️ 3° · 좋음 · 약 45분 예상. 2호선 강남역 3분 후 도착"`
- 하지만 **실제 DOM 텍스트**도 같은 내용 포함
- 스크린 리더가 두 번 읽을 가능성

**제안**:
```tsx
// aria-label 제거, 텍스트만으로 충분
<section className="morning-briefing">
  <span className="morning-briefing-label" aria-label="출근 브리핑">
    {briefing.contextLabel}
  </span>
  ...
</section>
```

---

#### P2-2: Transit 갱신 시간 위치 비직관적

**컴포넌트**: `CommuteSection.tsx`

**문제**:
```tsx
<div className="today-transit-header">
  <span className="today-transit-title">실시간 교통</span>
  <span className="today-transit-update">
    {isTransitRefreshing ? '갱신 중...' : lastTransitUpdate ? formatRelativeTime(lastTransitUpdate) : ''}
  </span>
</div>
```
- "마지막 갱신 시간"이 **오른쪽에만** 표시
- 모바일에서 텍스트가 잘려 보일 수 있음
- "갱신 중..." 상태일 때 spinner 없음 (코드에는 `.spinner` 있으나 갱신 헤더엔 없음)

**제안**:
```tsx
<span className="today-transit-update">
  {isTransitRefreshing && <span className="spinner spinner-sm" aria-hidden="true" />}
  {isTransitRefreshing ? '갱신 중...' : formatRelativeTime(lastTransitUpdate)}
</span>
```

---

#### P2-3: Pulse 애니메이션 과도함

**컴포넌트**: `home.css` (.arriving-soon-text)

**문제**:
```css
@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
/* 2초마다 반복 */
```
- 주의를 끌기 위한 의도는 좋으나, **2초 주기가 너무 짧음**
- 여러 항목이 동시에 pulse하면 화면이 산만함
- `prefers-reduced-motion` 대응은 되어 있음 (좋음)

**제안**:
```css
@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; } /* 더 부드럽게 */
}
animation: pulse-text 3s ease-in-out infinite; /* 3초로 완화 */
```

---

### P3: 향후 개선 (Enhancement)

#### P3-1: 모바일 터치 타겟 사이즈

**컴포넌트**: `CommuteSection.tsx` (route-type-btn)

**현황**:
```css
.route-type-btn {
  /* 크기 명시 없음, 텍스트 길이에 따라 결정 */
}
```
- "자동", "출근", "퇴근" 버튼 크기가 작을 수 있음
- WCAG 2.5.5 Target Size (AAA) 권장: 최소 44x44px

**제안**:
```css
.route-type-btn {
  min-width: 60px;
  min-height: 44px;
  padding: 8px 12px;
}
```

---

#### P3-2: 빈 상태 처리 강화

**컴포넌트**: `build-briefing.ts`

**현황**:
- `if (!routeName) return null;` → 브리핑 카드 자체가 사라짐
- 사용자가 "왜 안 떠?" 의문 가능

**제안**:
```tsx
// 빈 상태 UI 추가
if (!briefing) {
  return (
    <section className="morning-briefing morning-briefing--empty">
      <p>경로를 등록하면 출근 브리핑을 볼 수 있어요</p>
      <Link to="/routes">경로 등록하기</Link>
    </section>
  );
}
```

---

#### P3-3: 카드 간 시각적 위계 부족

**컴포넌트**: `HomePage.tsx` + `home.css`

**현황**:
- Morning Briefing → Weather Hero → Commute Section 순서
- 모든 카드가 비슷한 크기/색상 → **중요도 구분 어려움**

**제안**:
```css
/* Weather Hero를 더 크게/강조 */
.weather-hero {
  padding: 24px; /* 기존 20px → 24px */
  box-shadow: var(--shadow-md);
}

/* Morning Briefing은 더 작게/부드럽게 */
.morning-briefing {
  padding: 10px 14px; /* 기존 12px 16px → 축소 */
  box-shadow: none;
}
```

---

## 정보 구조 (IA) 분석

### ✅ 잘된 점

1. **시간 컨텍스트 자동 감지** (`getTimeContext()`)
   - 오전/오후/저녁 시간대별로 브리핑 변화 → 사용자가 "지금 필요한 정보"만 노출

2. **Transit 정보 우선순위** (`buildSubLine()`)
   - 첫 번째 도착정보만 브리핑에 노출 → 인지 부하 감소

3. **폴백 전략 명확**
   - Weather 없으면 → AQI만 / 통계 없으면 → 경로명만 표시

### ⚠️ 개선 필요

1. **브리핑 카드 위치**
   - 현재: 헤더 → 브리핑 → 날씨 → 출퇴근 카드
   - 제안: 헤더 → **출퇴근 카드** → 브리핑 (통합) → 날씨
   - 이유: 사용자의 핵심 목표는 "출발하기" → 가장 위에 위치해야 함

2. **중복 정보 표시**
   - 브리핑에 "약 45분 예상" + 통계 카드에도 평균 시간 → 같은 정보 두 번
   - 제안: 브리핑에는 **날씨 + Transit만**, 시간 예상은 통계로 이동

---

## 모바일 반응형 검증 (320px ~ 768px)

### ✅ 통과

- `.morning-briefing` 카드 → 텍스트 줄바꿈 정상
- `.today-transit-item` → flex 레이아웃으로 깔끔
- `.today-transit-update` → 오른쪽 정렬, 잘림 없음 (단, 긴 상대시간 표시 시 주의)

### ⚠️ 주의

- **320px 화면**: `.morning-briefing-main` 텍스트가 "☀️ 3° · 좋음 · 약 45분 예상" → 22글자
  - 작은 폰트에서 2줄로 넘어갈 수 있음 → 여백 확인 필요

---

## WCAG 2.1 체크리스트

| 기준 | 상태 | 비고 |
|------|:----:|------|
| **1.4.1 Use of Color** | ❌ | P0-2: `.arriving-soon` 색상만 사용 |
| **1.4.3 Contrast (Minimum)** | ❌ | P0-1: Gradient 대비율 미달 |
| **2.1.1 Keyboard** | ✅ | 모든 상호작용 요소가 버튼 또는 링크 |
| **2.4.4 Link Purpose** | ✅ | 모든 링크 텍스트 명확 |
| **2.5.5 Target Size (AAA)** | ⚠️ | P3-1: route-type-btn 크기 검증 필요 |
| **4.1.2 Name, Role, Value** | ✅ | `aria-label`, `aria-live` 적절 사용 |
| **4.1.3 Status Messages** | ⚠️ | P1-1: 실시간 갱신 알림 보강 필요 |

---

## 최종 권고사항

### 배포 전 필수 조치 (P0/P1)
1. **P0-1**: Gradient 배경 색상 대비율 4.5:1 이상 확보
2. **P0-2**: `.arriving-soon` 아이콘 또는 밑줄 추가
3. **P1-1**: 스크린 리더 갱신 알림 추가 (`aria-live` 강화)

### 배포 후 1주일 내 개선 (P2)
4. **P2-2**: Transit 갱신 헤더에 spinner 추가
5. **P2-3**: Pulse 애니메이션 주기 3초로 완화

### 다음 사이클 검토 (P3)
6. **P3-2**: 브리핑 빈 상태 UI 추가
7. **P3-3**: 카드 시각적 위계 조정 (날씨 vs 브리핑)

---

## 검증 체크리스트

- [ ] WebAIM Contrast Checker로 `.morning-briefing--morning` 배경 측정
- [ ] VoiceOver (iOS) 또는 TalkBack (Android)로 스크린 리더 테스트
- [ ] Chrome DevTools → Lighthouse Accessibility 점수 95+ 확인
- [ ] 320px 뷰포트에서 레이아웃 깨짐 없는지 확인
- [ ] `prefers-reduced-motion` 설정 후 애니메이션 비활성화 확인

---

**종합 평가**: **APPROVE WITH CONDITIONS**
P0 이슈 2건 해결 후 배포 승인. 전반적인 UX 방향은 우수하며, 접근성 이슈만 보완하면 사용자 경험 크게 개선될 것으로 판단됨.
