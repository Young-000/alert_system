# Accessibility 점검 보고서 (Round 7)

## 요약
- 전체 점검 파일: 약 130개 TSX 파일 (presentation/)
- 발견된 이슈: 6건 (수정 완료: 2건, 양호: 4건)
- 전반적으로 accessibility가 잘 구성된 코드베이스

---

## 1. 이미지 `<img>` alt 속성

**결과: 이슈 없음**
- 전체 코드베이스에서 `<img>` 태그 사용 없음
- 아이콘은 모두 인라인 SVG로 구현되며 `aria-hidden="true"` 적용

---

## 2. 아이콘 버튼 `aria-label` 누락

**결과: 전반적으로 양호**

주요 아이콘 버튼 검토:
- `RouteCard.tsx`: 수정/삭제/출발하기 버튼 모두 `aria-label` 있음
- `AlertList.tsx`: 수정/삭제 버튼 `aria-label` 있음
- `SortableStopItem.tsx`: 드래그 핸들(순서 변경), 삭제 버튼 모두 `aria-label` 있음
- `ProfileTab.tsx`: ID 복사 버튼 `aria-label="ID 복사"` 있음
- `LoginPage.tsx`: 비밀번호 표시/숨기기 버튼 동적 `aria-label` 있음
- `StationSearchStep.tsx` (alert-settings): 검색어 지우기 버튼 `aria-label` 있음
- `MissionAddModal.tsx`: 닫기 버튼 `aria-label="닫기"` 있음

---

## 3. 폼 `<input>` 라벨 연결

**결과: 양호**

전체 input 검토:
- `LoginPage.tsx`: 이메일/이름/전화번호/비밀번호 모두 `<label htmlFor>` 연결
- `RoutineStep.tsx`: 기상시간/출근출발/퇴근출발 `<label htmlFor>` 연결
- `PlacesTab.tsx`: 유형/이름/주소 `<label htmlFor>` 연결
- `SmartDepartureTab.tsx`: 유형/경로/도착시간/준비시간 `<label htmlFor>` 연결
- `EditAlertModal.tsx`: 알림이름/알림시간 `<label htmlFor>` 연결
- `ConfirmStep.tsx` (route-setup): 경로 이름 `<label htmlFor="route-name-field">` 연결
- `ConfirmStep.tsx`: 퇴근경로 체크박스 `<label>` wrapping (암묵적 연결, 유효)
- `OnboardingPage.tsx`: range input `aria-label="예상 소요 시간"` 있음
- `MissionAddModal.tsx`: 미션 이름 `<label htmlFor="mission-title">` 연결
- `TipForm.tsx`: textarea `aria-label="팁 작성"` 있음
- `AppTab.tsx`: 푸시알림 toggle `aria-label="푸시 알림 켜기/끄기"` 있음

**마이너 이슈**: `ToggleSwitch` 컴포넌트는 `ariaLabel` prop이 선택적(optional)이라 누락 시 label 없는 toggle 생성 가능하나, 현재 직접 사용처 없음

---

## 4. `<div onClick>` → `<button>` 변환

**결과: 이슈 없음**

`<div onClick>` 검색 결과:
- `DeleteConfirmModal.tsx` (line 29): `<div ref={trapRef} className="modal" onClick={(e) => e.stopPropagation()}>` - 이벤트 버블링 차단용 (인터랙티브 의도 없음, 정상)
- `EditAlertModal.tsx` (line 31): 동일 패턴, 정상

모든 실제 인터랙션은 `<button>` 또는 `<Link>`로 구현됨

---

## 5. 키보드 접근성

**결과: 대체로 양호, 1건 수정**

### 수정됨 (#1): StationSearchStep (route-setup) - 중복 tabIndex
**파일**: `frontend/src/presentation/pages/route-setup/StationSearchStep.tsx`

**문제**: `<li role="option" tabIndex={0}>` 안에 `<button>` 존재 → `<li>`와 `<button>` 모두 Tab 순서에 포함되어 중복 포커스 발생

```tsx
// 수정 전
<li role="option" tabIndex={0}>
  <button type="button" ...>

// 수정 후
<li role="presentation">
  <button type="button" role="option" aria-selected={false} ...>
```

지하철역 목록(groupedSubwayResults)과 버스 정류장 목록(busResults) 모두 수정.

**기타 키보드 접근성 확인**:
- `MissionsPage.tsx`: `role="checkbox"` div에 `onKeyDown`, `tabIndex={0}` 적용 (Enter/Space 처리)
- `MissionAddModal.tsx`: title input에 Enter키 제출 처리
- `TipForm.tsx`: textarea에 Enter 키 제출 (Shift+Enter는 줄바꿈)
- `BottomNavigation.tsx`: `<Link>` 사용으로 키보드 접근 가능
- 모든 모달에 `useFocusTrap` + ESC 키 처리 적용

---

## 6. 시맨틱 HTML

**결과: 양호**

- `LoginPage.tsx`: `<main>`, `<nav>`, `<section>`, `<form>`, `<footer>` 적절히 사용
- `OnboardingPage.tsx`: `<main>`, `<nav>`, `<section>`, `<footer>` 사용
- `HomePage.tsx`: `<main>`, `<header>` 사용, skip link `<a href="#weather-hero">본문으로 건너뛰기</a>` 있음
- `BottomNavigation.tsx`: `<nav role="navigation" aria-label="메인 메뉴">` 적절
- `AlertList.tsx`: 각 알림 항목에 `<article>` 사용
- 탭 패널들: `role="tabpanel"`, `aria-labelledby` 적절히 설정
- 모달들: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 모두 적용

---

## 7. Focus 관리

**결과: 우수**

- `ConfirmModal.tsx`, `EditAlertModal.tsx`, `DeleteConfirmModal.tsx`, `MissionAddModal.tsx`, `LineSelectionModal.tsx`: 모두 `useFocusTrap` 사용
- ESC 키 처리: 모든 모달에 `onEscape` 핸들러 적용 (로딩 중 비활성화)
- 오버레이 클릭 닫기: 모든 모달에서 `onClick={onCancel}` 적용

---

## 8. 색상 대비

**결과: 주의 필요, 1건 수정**

### 수정됨 (#2): RouteAnalyticsCard - 등급 배지 접근성 향상
**파일**: `frontend/src/presentation/pages/commute-dashboard/RouteAnalyticsCard.tsx`

**문제**: `#FFD700` (노란색) 배경에 텍스트 "S" 표시 시 흰색 텍스트와 대비율 불충분 가능성. 또한 등급 의미를 스크린 리더에 전달 안 됨.

```tsx
// 수정 전
<div className={`analytics-grade grade-${analytics.grade.toLowerCase()}`}
  style={{ backgroundColor: gradeColors[analytics.grade] || '#888' }}>
  {analytics.grade}
</div>

// 수정 후
<div className={`analytics-grade grade-${analytics.grade.toLowerCase()}`}
  style={{ backgroundColor: gradeColors[analytics.grade] || '#888' }}
  aria-label={`등급 ${analytics.grade}`}>
  <span aria-hidden="true">{analytics.grade}</span>
</div>
```

**기타 색상 주의 사항**:
- `BriefingSection.tsx`: `#1D4ED8` (파란색/info), `#92400E` (황갈색/warning), `#991B1B` (빨간색/danger) 사용. 해당 색상들은 CSS 변수 대신 하드코딩됨. 배경이 `rgba(...)` 반투명이므로 실제 화면 배경에 따라 대비율이 달라질 수 있음. 현재 사용하는 배경색(`rgba(59,130,246,0.1)` 등)과 조합 시 WCAG AA 기준(4.5:1) 충족 예상.
- `LineChip.tsx`: 지하철 노선 색상 사용. 밝은 색(`#FABE00` 수인분당선, `#B0CE18` 우이신설선) 적용 시 흰색 텍스트와 대비율 이슈 가능. CSS에서 텍스트 색상 처리 방식 확인 필요 (스코프 외).

---

## 9. 스크린 리더 지원

**결과: 우수**

- `aria-live="polite"` 사용: `StationSearchStep`, `TipForm` 등에서 동적 콘텐츠 공지
- `role="alert"`: 에러 메시지에 적절히 사용
- `role="status"`: 성공 메시지에 적절히 사용
- `aria-busy`: 로딩 상태 표시 (`BriefingSection`)
- `aria-hidden="true"`: 장식용 아이콘/이모지 모두 적용
- `aria-current="page"`: `BottomNavigation`에서 현재 페이지 표시

---

## 수정 파일 목록

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/presentation/pages/route-setup/StationSearchStep.tsx` | `<li role="option" tabIndex={0}>` → `<li role="presentation">` + button에 `role="option" aria-selected={false}` 이동 |
| `frontend/src/presentation/pages/commute-dashboard/RouteAnalyticsCard.tsx` | 등급 배지에 `aria-label={등급 ${grade}}` 추가 |

---

## 잔존 권장 사항 (수정 불필요, 모니터링)

1. `BriefingSection.tsx`: 하드코딩 색상(`#1D4ED8`, `#92400E`, `#991B1B`) → CSS 변수로 통일 권장
2. `LineChip.tsx`: 밝은 노선 색상 배경에 텍스트 대비율 CSS에서 검증 필요
3. `ToggleSwitch.tsx`: `ariaLabel` prop에 required 추가 고려
