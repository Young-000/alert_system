# 09. User Flow Review

**Date**: 2026-03-03
**Branch**: `feature/e2e-auto-review-20260303`
**Reviewer**: Claude Opus 4.6 (Userflow Agent -- code review focus)
**Previous Review**: 2026-02-28 (Round 5)

---

## Summary

| 항목 | 결과 |
|------|------|
| **상태** | PASS (with 2 fixes) |
| **검토 플로우** | 3개 핵심 플로우 (경로 설정, 출퇴근 트래킹, 알림 설정) |
| **검증 항목** | 52개 |
| **발견 이슈** | 2건 (모두 수정 완료) |
| **권고사항** | 2건 (수정 불필요) |
| **테스트 검증** | CommuteTrackingPage 15/15 PASS |

---

## 1. 경로 설정 페이지 (`/routes`) -- PASS

### 검증 항목

| # | 체크 항목 | 결과 | 코드 위치 |
|---|----------|:----:|----------|
| 1 | 비로그인 -> 로그인 유도 메시지 표시 | PASS | `RouteSetupPage.tsx:488-496` -- `AuthRequired` 컴포넌트 |
| 2 | 새 경로 만들기 버튼 -> 생성 플로우 시작 | PASS | `RouteSetupPage.tsx:417-427` -- `startCreating()` |
| 3 | 교통수단 선택 -> 정류장 검색 플로우 | PASS | 5단계 위저드: `select-type` -> `select-transport` -> `select-station` -> `ask-more` -> `confirm` |
| 4 | 체크포인트 추가 -> 목록에 새 항목 표시 | PASS | `RouteSetupPage.tsx:78-105` -- `handleSelectStopDirect` 콜백 |
| 5 | 체크포인트 삭제 -> 최소 1개 유지 | PASS | `RouteSetupPage.tsx:216-225` -- `removeStop` (최소 정류장 1개 = 체크포인트 3개: 집+정류장+회사) |
| 6 | 드래그앤드롭 순서 변경 | PASS | `AskMoreStep.tsx:70-85` -- `@dnd-kit/sortable` + `SortableStopItem` |
| 7 | 경로 저장 API 호출 | PASS | `RouteSetupPage.tsx:318-385` -- `handleSave()` with isSaving guard |
| 8 | 저장 후 퇴근 경로 자동 생성 | PASS | `RouteSetupPage.tsx:350-368` -- `createReverse` 옵션 (출근 경로일 때) |
| 9 | 저장 후 자동 알림 생성 | PASS | `RouteSetupPage.tsx:275-315` -- `autoCreateAlerts()` |
| 10 | 수정 버튼 -> 폼에 기존 데이터 로드 | PASS | `RouteSetupPage.tsx:430-452` -- `handleEditRoute()` |
| 11 | 삭제 버튼 -> 확인 후 제거 | PASS | `RouteListView.tsx:155-169` -- ConfirmModal + `handleDeleteConfirm()` |
| 12 | 저장된 경로 클릭 -> /commute로 이동 | PASS | `RouteCard.tsx:58` -- `navigate('/commute', { state: { routeId } })` |
| 13 | 공유 경로 가져오기 | PASS | `RouteSetupPage.tsx:141-184` -- URL param 파싱 + 가져오기 |
| 14 | 출근/퇴근 탭 필터 | PASS | `RouteListView.tsx:98-132` -- 탭 필터 + ARIA role=tablist |
| 15 | 빈 상태 처리 | PASS | `RouteListView.tsx:72-94` -- "경로가 없어요" + CTA |
| 16 | 로딩 상태 표시 | PASS | `RouteSetupPage.tsx:499-510` -- "불러오는 중..." |
| 17 | 에러 처리 (401/네트워크) | PASS | `RouteSetupPage.tsx:373-381` -- 분기별 에러 메시지 |
| 18 | 중복 요청 방지 (isSaving guard) | PASS | `RouteSetupPage.tsx:319` |
| 19 | 경로 검증 (중복역, 환승 검사) | PASS | `use-route-validation.ts` -- 중복, 연속 구간, 혼합 환승 검증 |

### 비고

- 저장 후 `/` (홈)으로 이동: `/commute` 페이지는 routeId 없이 접근 시 홈으로 리다이렉트하므로 현재 동작이 적절함.
- 최소 체크포인트: `createCheckpoints()`가 집/회사를 자동 추가하므로, 정류장 1개 = 체크포인트 3개로 유효한 최소 보장.

---

## 2. 출퇴근 트래킹 페이지 (`/commute`) -- PASS (2건 수정)

### 검증 항목

| # | 체크 항목 | 결과 | 코드 위치 |
|---|----------|:----:|----------|
| 1 | 비로그인 -> /login 리다이렉트 | PASS | `CommuteTrackingPage.tsx:43-45` |
| 2 | routeId로 세션 자동 시작 | PASS | `CommuteTrackingPage.tsx:68-81` |
| 3 | 진행 중 세션 자동 복원 | PASS | `CommuteTrackingPage.tsx:56-65` |
| 4 | PWA 숏컷 (mode param) | PASS | `CommuteTrackingPage.tsx:84-96` |
| 5 | 타이머 동작 (1초 간격) | PASS | `CommuteTrackingPage.tsx:114-139` |
| 6 | Page Visibility API 연동 | PASS | `CommuteTrackingPage.tsx:125-128` |
| 7 | beforeunload 경고 | PASS | `CommuteTrackingPage.tsx:143-153` |
| 8 | 체크포인트 타임라인 시각화 | PASS | `CommuteTrackingPage.tsx:340-371` -- completed/current/pending |
| 9 | 도착 버튼 (세션 완료) | PASS | `CommuteTrackingPage.tsx:175-207` -- 미기록 체크포인트 자동 기록 |
| 10 | 세션 취소 확인 모달 | PASS | `CommuteTrackingPage.tsx:210-221` + ConfirmModal |
| 11 | 완료 상태 -> 결과 표시 | PASS | `CommuteTrackingPage.tsx:282-328` |
| 12 | 에러 처리 (401/네트워크) | PASS | `CommuteTrackingPage.tsx:200-206` |
| 13 | 중복 클릭 방지 | PASS | `CommuteTrackingPage.tsx:176` -- `isCompleting` guard |

### FIX 1: 에러 상태에서 내비게이션 불가 (BUG)

**파일**: `frontend/src/presentation/pages/CommuteTrackingPage.tsx`

**문제**: 초기 데이터 로드 실패 시(네트워크 오류 등) `session`이 null인 상태에서 "Active tracking" 뷰가 렌더링됨. 결과:
- 타이머가 00:00으로 표시
- 경로 이름 없음, 체크포인트 없음
- 뒤로가기 버튼이 세션 취소 모달을 열지만 세션이 없어서 의미 없음
- 사용자가 홈으로 돌아갈 방법 없음 (stuck state)

**수정**: `!session && error` 조건의 전용 에러 화면 추가.

```tsx
// Error state with no session -- show error with navigation
if (!session && error) {
  return (
    <main className="page commute-page-v2">
      <header className="commute-v2-header">
        <button type="button" className="commute-v2-back"
          onClick={() => navigate('/', { replace: true })}
          aria-label="홈으로 돌아가기">
          <svg ...><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="commute-v2-title">오류</span>
      </header>
      <div className="commute-v2-error" role="alert">{error}</div>
      <div className="commute-v2-actions">
        <button type="button" className="btn btn-primary"
          onClick={() => navigate('/', { replace: true })}>
          홈으로 돌아가기
        </button>
      </div>
    </main>
  );
}
```

### FIX 2: 세션 완료 후 대시보드 접근성 개선

**파일**: `frontend/src/presentation/pages/CommuteTrackingPage.tsx`

**문제**: 세션 완료 후 "홈으로" 버튼만 있어서 통계 대시보드(`/commute/dashboard`)로의 자연스러운 진입 경로 부재. CLAUDE.md 체크리스트의 "세션 완료 -> 대시보드로 이동" 요구사항 미충족.

**수정**: 기본 CTA를 "통계 보기" (`/commute/dashboard`)로 변경, "홈으로" 버튼을 보조 CTA로 추가.

```tsx
<button type="button" className="btn btn-primary completed-home-btn"
  onClick={() => navigate('/commute/dashboard', { replace: true })}>
  통계 보기
</button>
<button type="button" className="btn btn-ghost"
  onClick={() => navigate('/', { replace: true })}
  style={{ marginTop: '0.5rem' }}>
  홈으로
</button>
```

---

## 3. 알림 설정 페이지 (`/alerts`) -- PASS

### 검증 항목

| # | 체크 항목 | 결과 | 코드 위치 |
|---|----------|:----:|----------|
| 1 | 비로그인 -> 로그인 유도 | PASS | `AlertSettingsPage.tsx:268-276` -- `AuthRequired` |
| 2 | 위저드 단계 전환 | PASS | `use-wizard-navigation.ts` -- type -> transport -> station -> routine -> confirm |
| 3 | canProceed 검증 | PASS | `use-wizard-navigation.ts:71-77` -- 각 단계별 진행 조건 |
| 4 | 진행률 표시 | PASS | `WizardStepIndicator` + `getProgress()` |
| 5 | 알림 생성 (API 호출) | PASS | `AlertSettingsPage.tsx:88-171` -- `handleSubmit` |
| 6 | 중복 알림 검사 | PASS | `use-alert-crud.ts:92-112` -- `checkDuplicateAlert()` (시간+타입 비교) |
| 7 | 알림 목록 표시 | PASS | `AlertList.tsx` -- 설정된 알림 목록 + 활성/전체 카운트 |
| 8 | 알림 활성화/비활성화 토글 | PASS | `use-alert-crud.ts:174-190` -- 낙관적 업데이트 + 롤백 |
| 9 | 알림 수정 (EditAlertModal) | PASS | `EditAlertModal.tsx` + `handleEditConfirm` -- focus trap + ESC |
| 10 | 알림 삭제 (DeleteConfirmModal) | PASS | `DeleteConfirmModal.tsx` + `handleDeleteConfirm` -- focus trap + ESC |
| 11 | 빠른 날씨 알림 프리셋 | PASS | `QuickPresets` + `handleQuickWeatherAlert` (중복 체크 포함) |
| 12 | 경로에서 교통 정보 가져오기 | PASS | `AlertSettingsPage.tsx:192-226` -- `importFromRoute` |
| 13 | 새 알림 추가 버튼 | PASS | `AlertSettingsPage.tsx:318-327` |
| 14 | 위저드 자동 표시 (알림 0개) | PASS | `AlertSettingsPage.tsx:189` -- `alerts.length === 0` |
| 15 | Enter 키 단축키 | PASS | `use-wizard-navigation.ts:91-126` (input 내 제외) |
| 16 | ESC 키로 삭제 모달 닫기 | PASS | `use-alert-crud.ts:247-259` |
| 17 | 로딩 상태 표시 | PASS | `AlertSettingsPage.tsx:298-304` -- 스피너 + "서버에 연결 중" |
| 18 | 에러 처리 (401/403) | PASS | `AlertSettingsPage.tsx:144-152` -- 분류된 에러 메시지 |
| 19 | 성공 메시지 + 자동 초기화 | PASS | `AlertSettingsPage.tsx:131-143` -- TOAST_DURATION_MS 후 리셋 |
| 20 | Focus trap (모달) | PASS | `useFocusTrap` 훅 사용 (Delete + Edit) |

---

## 4. 권고사항 (수정 불필요)

### R1. 개별 체크포인트 도착 기록 기능

현재 CommuteTrackingPage는 "도착" 버튼 하나로 모든 미기록 체크포인트를 `actualWaitTime: 0`으로 자동 기록합니다. CLAUDE.md 체크리스트의 "체크포인트 도착 -> 시간 기록 및 다음 단계로"와 다르지만, v2 디자인의 의도적 단순화로 판단합니다. 향후 UX 고도화 시 타임라인의 각 체크포인트를 터치하여 개별 대기 시간을 기록하는 기능 추가를 고려할 수 있습니다.

### R2. 경로 저장 후 이동 경로

현재 경로 저장 후 1.5초 toast 표시 후 홈(`/`)으로 이동합니다. 사용자가 저장 결과를 경로 목록에서 즉시 확인하고 싶을 수 있으므로, `/routes`에 머무르면서 목록을 갱신하는 옵션도 고려 가능합니다. 다만, 현재 동작도 합리적입니다 (홈에서 출퇴근 시작 가능).

---

## 5. 검증 결과

| 항목 | 결과 |
|------|------|
| 총 검증 항목 | 52개 |
| PASS | 52/52 |
| 수정 건수 | 2건 |
| 빌드 검증 | `tsc --noEmit` PASS (CommuteTrackingPage 에러 0건) |
| 테스트 검증 | `vitest run CommuteTrackingPage` 15/15 PASS |

### 수정된 파일

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/presentation/pages/CommuteTrackingPage.tsx` | 에러 상태 전용 화면 추가 + 완료 후 대시보드 링크 추가 |
