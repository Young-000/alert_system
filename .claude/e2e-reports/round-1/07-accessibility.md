# 접근성 점검 결과 (07-accessibility)

**점검일**: 2026-03-14  
**대상**: `frontend/src/**/*.tsx` 전체  
**수정 건수**: 7건

---

## 1. img alt 속성

**결과**: ✅ 통과  
**내용**: 코드베이스 전체에 `<img>` 태그가 존재하지 않음. 모든 이미지는 인라인 SVG 또는 이모지로 처리되어 있으며, 장식용 SVG에는 `aria-hidden="true"`가 적절히 적용되어 있음.

---

## 2. 아이콘 버튼 aria-label

**결과**: ✅ 통과  
**내용**: 텍스트 없는 아이콘 버튼 전체 확인 결과, 모두 `aria-label` 속성을 보유함.

주요 확인 파일:
- `ConfirmModal.tsx` — 닫기 버튼 `aria-label="닫기"` ✅
- `AlertListPage.tsx` — 삭제/편집 버튼 `aria-label` 있음 ✅
- `StationSearchStep.tsx` — 제거 버튼 `aria-label={...}` 동적 생성 ✅
- `CommuteDashboardPage.tsx` — 아이콘 버튼 `aria-label` 있음 ✅

---

## 3. 폼 라벨 (input + label/aria-label)

**결과**: ✅ 통과  
**내용**: 모든 `<input>` 요소에 `<label htmlFor>` 또는 `aria-label`이 연결되어 있음.

주요 확인:
- `RoutineStep.tsx` — `<label htmlFor="wake-up-time">`, `<label htmlFor="leave-home-time">`, `<label htmlFor="leave-work-time">` ✅
- `StationSearchStep.tsx` — `<input aria-label="역 또는 정류장 검색">` ✅
- `LoginPage.tsx` — 전화번호, 인증코드 입력 모두 label 연결 ✅

---

## 4. 시맨틱 HTML (div onClick → button)

**결과**: ✅ 통과  
**내용**: 클릭 가능한 요소에 `<div onClick>` 패턴 없음. 모든 인터랙티브 요소는 `<button>` 사용.

단, `useCollapsible` 훅이 `<div>` 요소에 `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space 처리)를 주입하는 패턴 사용 — 키보드 접근성이 완전히 구현되어 있어 ARIA 명세상 허용되는 패턴으로 판단함.

---

## 5. Skip Link (건너뛰기 링크)

**결과**: ✅ 통과  
**내용**: 주요 진입 페이지에 Skip Link가 존재함.

- `HomePage.tsx` — `<a className="skip-link" href="#main-content">` ✅
- `GuestLanding.tsx` — Skip Link 존재 ✅
- `LoginPage.tsx` — Skip Link 존재 ✅

내부 페이지(AlertListPage, RoutesPage 등)는 앱 쉘 구조상 진입점이 아니므로 생략 허용.

---

## 6. 키보드 접근성

**결과**: ✅ 통과  
**내용**: 비-네이티브 인터랙티브 요소에 키보드 처리가 구현되어 있음.

- `useCollapsible.ts` — `tabIndex: 0`, `onKeyDown` (Enter: `click()`, Space: `click()` + `preventDefault()`) ✅
- `WeatherHeroSection.tsx`, `StatsSection.tsx` — `useCollapsible` 활용 ✅
- 모든 토글/버튼은 네이티브 `<button>` 사용으로 자동 키보드 지원 ✅

---

## 7. 포커스 관리 (모달 focus trap)

**결과**: ✅ 통과  
**내용**: `useFocusTrap` 커스텀 훅이 구현되어 있으며 모든 모달에 적용됨.

- `useFocusTrap.ts` — 포커스 가능한 요소 감지 + Tab/Shift+Tab 트랩 + ESC 닫기 구현 ✅
- `ConfirmModal.tsx` — `useFocusTrap` 적용 ✅
- `CommuteDashboardPage.tsx` 내 모달 — 동일 패턴 ✅

---

## 8. ARIA role 속성

**결과**: ✅ 통과 (수정 1건 포함)

**수정됨**: `MissionsPage.tsx` — `StatsCard` 내 진행률 바에 ARIA role 누락

```tsx
// 수정 전
<div className="mission-progress-track">

// 수정 후
<div
  className="mission-progress-track"
  role="progressbar"
  aria-valuenow={Math.round(completionRate)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="오늘 달성률"
>
```

기타 확인:
- `StationSearchStep.tsx` — `role="listbox"`, `role="option"`, `role="radiogroup"`, `role="radio"` ✅
- `TransportTypeStep.tsx` — `role="group"` ✅
- `TypeSelectionStep.tsx` — `role="group"`, `role="alert"`, `role="status"` ✅
- `ConfirmStep.tsx` — `role="alert"`, `role="status"` ✅
- `aria-live="polite"` + `aria-atomic="true"` 동적 영역 처리 ✅

---

## 9. Heading 계층 (h1→h2→h3)

**결과**: ✅ 통과 (수정 5건 포함)

**문제**: `AlertSettingsPage`는 `PageHeader` 컴포넌트를 통해 이미 `<h1>알림</h1>`을 렌더링하는데, 내부 wizard step 컴포넌트들이 각자 `<h1>`을 사용하여 페이지에 h1이 중복 존재했음.

**수정된 파일 및 변경 내용**:

| 파일 | 수정 내용 |
|------|----------|
| `TypeSelectionStep.tsx` | `<h1>어떤 정보를 받고 싶으세요?</h1>` → `<h2>` |
| `TransportTypeStep.tsx` | `<h1>어떤 교통수단을 이용하세요?</h1>` → `<h2>` |
| `StationSearchStep.tsx` | `<h1>자주 이용하는 역/정류장을 검색하세요</h1>` → `<h2>` |
| `RoutineStep.tsx` | `<h1>하루 루틴을 알려주세요</h1>` → `<h2>` |
| `ConfirmStep.tsx` | `<h1>설정을 확인해주세요</h1>` → `<h2>` (하위 `<h3>` 계층은 적절히 유지됨) |

**참고**: `route-setup` wizard steps (`RouteNameStep`, `CheckpointStep` 등)은 `PageHeader` 없이 독립 렌더링되므로 해당 `<h1>` heading은 올바름 — 수정 불필요.

---

## 10. 색상 대비 (코드 레벨)

**결과**: ✅ 통과 (코드 레벨 확인 범위)  
**내용**: CSS Custom Properties 기반 테마 색상 사용 (`--primary`, `--muted`, `--error`, `--success`). 실제 대비값은 런타임 스타일 확인이 필요하나, 코드 레벨에서 확인 가능한 하드코딩된 저대비 색상 조합 없음.

- `badge-primary`, `notice error/success`, `toast-error/success` 등 시맨틱 클래스 사용 ✅
- 정보 전달에 색상만 의존하는 패턴 없음 — 아이콘 + 텍스트 함께 사용 ✅

---

## 추가 수정사항

### ToggleSwitch.tsx — ariaLabel 필수 속성으로 변경

**문제**: `ariaLabel?: string` (옵셔널)으로 선언되어 있어, 호출 시 미전달 시 체크박스 input에 접근 가능한 이름이 없을 수 있음.

**수정**: `ariaLabel: string` (필수)로 변경

```tsx
// 수정 전
interface ToggleSwitchProps {
  ariaLabel?: string;
  ...
}

// 수정 후
interface ToggleSwitchProps {
  ariaLabel: string;
  ...
}
```

---

## 수정 요약

| # | 파일 | 수정 내용 | 카테고리 |
|---|------|----------|---------|
| 1 | `ToggleSwitch.tsx` | `ariaLabel` 필수 속성으로 변경 | 폼 라벨 |
| 2 | `MissionsPage.tsx` | 진행률 바 `role="progressbar"` + ARIA 값 추가 | ARIA role |
| 3 | `alert-settings/TypeSelectionStep.tsx` | `<h1>` → `<h2>` | Heading 계층 |
| 4 | `alert-settings/TransportTypeStep.tsx` | `<h1>` → `<h2>` | Heading 계층 |
| 5 | `alert-settings/StationSearchStep.tsx` | `<h1>` → `<h2>` | Heading 계층 |
| 6 | `alert-settings/RoutineStep.tsx` | `<h1>` → `<h2>` | Heading 계층 |
| 7 | `alert-settings/ConfirmStep.tsx` | `<h1>` → `<h2>` | Heading 계층 |

**총 수정: 7건**
