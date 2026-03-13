# Phase 6: UX 상태 표시 일관성 점검

**날짜**: 2026-03-14
**상태**: PASS (2건 수정)

---

## 6-1. 로딩 상태 (스피너/스켈레톤)

| 페이지 | 로딩 처리 | 상태 |
|--------|----------|:----:|
| HomePage | 스켈레톤 카드 (skeleton-card) | PASS |
| AlertSettingsPage | 스피너 + "서버에 연결 중입니다..." 메시지 | PASS |
| RouteSetupPage | "불러오는 중..." 텍스트 | PASS |
| CommuteTrackingPage | 스피너 (spinner-lg) + "준비 중..." | PASS |
| CommuteDashboardPage | 스피너 + "통계를 불러오는 중..." | PASS |
| LoginPage | 제출 버튼에 스피너 + "처리 중..." | PASS |
| MissionsPage | 스켈레톤 카드 (skeleton-card) | PASS |
| NotificationHistoryPage | 스피너 + "불러오는 중..." | PASS |
| SettingsPage | 스피너 + "불러오는 중..." | PASS |
| OnboardingPage | "생성 중..." 텍스트 (버튼) | PASS |
| AuthCallbackPage | 스피너 (spinner-lg) + "로그인 처리 중..." | PASS |
| NotificationStats | 스켈레톤 텍스트 | PASS |

**결론**: 모든 API 호출 시 적절한 로딩 UI가 표시됨.

---

## 6-2. 빈 상태 (Empty State)

| 페이지/컴포넌트 | 빈 상태 처리 | 상태 |
|----------------|-------------|:----:|
| HomePage (비로그인) | GuestLanding 컴포넌트 | PASS |
| HomePage (경로 없음) | CommuteSection "출근 경로를 등록해보세요" + CTA | PASS |
| AlertSettingsPage (비로그인) | AuthRequired 컴포넌트 | PASS |
| AlertSettingsPage (알림 없음) | 자동으로 위저드 표시 (shouldShowWizard) | PASS |
| RouteSetupPage (비로그인) | AuthRequired 컴포넌트 | PASS |
| RouteSetupPage (경로 없음) | "경로가 없어요" + "경로 추가" CTA | PASS |
| CommuteDashboardPage (비로그인) | AuthRequired 컴포넌트 | PASS |
| CommuteDashboardPage (기록 없음) | EmptyState "아직 기록이 없어요" + CTA | PASS |
| CommuteDashboardPage (스톱워치 없음) | EmptyState "스톱워치 기록이 없어요" + CTA | PASS |
| NotificationHistoryPage (비로그인) | AuthRequired 컴포넌트 | PASS |
| NotificationHistoryPage (기록 없음) | "알림 기록이 없어요" + "알림 설정하기" CTA | PASS |
| NotificationHistoryPage (필터 결과 없음) | "필터 조건에 맞는 알림이 없습니다" | PASS |
| MissionsPage (비로그인) | 로그인 유도 버튼 | PASS |
| MissionsPage (미션 없음) | EmptyState "출퇴근을 알차게!" + CTA | PASS |
| SettingsPage (비로그인) | AuthRequired 컴포넌트 | PASS |

**결론**: 모든 리스트/데이터 컴포넌트에서 빈 상태가 적절히 처리됨.

---

## 6-3. 에러 상태 (에러 UI + 재시도)

| 페이지 | 에러 표시 | 재시도 버튼 | 상태 |
|--------|---------|:----------:|:----:|
| HomePage | `loadError` + "다시 시도" 버튼 | O | PASS |
| AlertSettingsPage | `loadError` + "다시 시도" 버튼 (retryLoad) | O | PASS |
| RouteSetupPage | `loadError` + "다시 시도" 버튼 (onRetryLoad) | O | PASS |
| CommuteTrackingPage | 에러 메시지 + 로그인/다시 시도 버튼 | O | PASS |
| CommuteDashboardPage | `loadError` + "다시 시도" 버튼 (retryLoad) | O | PASS |
| LoginPage | `error` notice 표시 | N/A (폼 재제출) | PASS |
| MissionsPage | "데이터를 불러오는 데 실패했습니다" + "다시 시도" 버튼 | O | PASS |
| NotificationHistoryPage | error-banner + "다시 시도" + 닫기 버튼 | O | PASS |
| OnboardingPage | `error` notice 표시 | N/A (다시 클릭) | PASS |
| AuthCallbackPage | 에러 메시지 + 자동 로그인 페이지 이동 | O (자동) | PASS |

**결론**: 모든 API 에러에 사용자 친화적 메시지와 재시도 수단이 있음.

---

## 6-4. 성공 피드백 (토스트/메시지)

| 액션 | 성공 피드백 | 수정 전 | 수정 후 | 상태 |
|------|-----------|:------:|:------:|:----:|
| 알림 생성 | `setCrudSuccess('알림이 설정되었습니다!')` | O | - | PASS |
| 알림 수정 | `setSuccess('알림이 수정되었습니다.')` | O | - | PASS |
| 알림 삭제 | success 메시지 없었음 | X | `setSuccess('알림이 삭제되었습니다.')` 추가 | **FIX** |
| 경로 저장 | `toast.success('경로가 저장되었습니다')` | O | - | PASS |
| 경로 수정 | `toast.success('경로가 수정되었습니다')` | O | - | PASS |
| 경로 삭제 | toast 없었음 | X | `toast.success('경로가 삭제되었습니다')` + ToastContainer 추가 | **FIX** |
| 로그인/회원가입 | 페이지 이동으로 암시적 피드백 | O | - | PASS |
| 알림 토글 | 토글 즉시 반영 (낙관적 업데이트) | O | - | PASS |
| 빠른 날씨 알림 | `setSuccess('날씨 알림이 설정되었습니다!')` | O | - | PASS |

**수정 내용**:
1. `use-alert-crud.ts`: `handleDeleteConfirm` 성공 시 `setSuccess('알림이 삭제되었습니다.')` + `setTimeout` 자동 해제 추가
2. `RouteSetupPage.tsx`: `handleDeleteConfirm` 성공 시 `toast.success('경로가 삭제되었습니다')` 추가 + 경로 목록 뷰에 `ToastContainer` 추가

---

## 6-5. 버튼 상태 (enabled/disabled/loading)

| 버튼 | disabled 처리 | 로딩 표시 | 상태 |
|------|:------------:|:--------:|:----:|
| 알림 생성 (위저드) | `isSubmitting \|\| !!success` | 스피너 + "저장 중..." | PASS |
| 알림 삭제 모달 | `isDeleting` | 스피너 + "삭제 중..." | PASS |
| 알림 수정 모달 | `isEditing` | - (빠른 작업) | PASS |
| 경로 저장 | `isSaving \|\| !validation.isValid` | "저장 중..." 텍스트 | PASS |
| 경로 삭제 모달 | `isLoading` (ConfirmModal) | ConfirmModal 처리 | PASS |
| 로그인 | `isLoading` | 스피너 + "처리 중..." | PASS |
| 출발하기 | `isCommuteStarting` | "시작 중..." 텍스트 | PASS |
| 도착 | `isCompleting` | "저장 중..." 텍스트 | PASS |
| 온보딩 경로 생성 | `isCreating` | "생성 중..." 텍스트 | PASS |
| 새 알림 추가 | `isSubmitting` | - | PASS |
| 알림 기록 더 보기 | `isLoading` | "불러오는 중..." 텍스트 | PASS |
| 미션 토글 | `isToggling` (toggleMutation.isPending) | `toggling` 클래스 | PASS |

**결론**: 모든 비동기 버튼에 disabled + 로딩 상태가 적절히 적용됨.

---

## 6-6. 모바일 터치 타겟 (44px 이상)

| 요소 | CSS 규칙 | 상태 |
|------|---------|:----:|
| `.btn` (base.css) | `min-height: 44px` | PASS |
| `.btn-icon` (routes.css) | `min-width: 44px; min-height: 44px` | PASS |
| `.btn-icon` (commute.css) | `width: 44px; height: 44px` | PASS |
| `.btn-icon` (settings.css) | `min-width: 44px; min-height: 44px` (line 368-369) | PASS |
| Toast 닫기 버튼 (Toast.tsx) | `min-w-[44px] min-h-[44px]` (Tailwind) | PASS |
| 홈 다양한 버튼 (home.css) | 다수 요소에 `min-height: 44px` 적용 | PASS |
| 미션 뒤로가기 (missions.css) | `min-width: 44px; min-height: 44px` | PASS |
| 알림 기록 닫기 (notification-history.css) | `min-width: 44px; min-height: 44px` | PASS |
| 설정 탭 (settings.css) | `min-width: 44px; min-height: 44px` | PASS |
| 패턴 인사이트 (patterns.css) | `min-width: 44px; min-height: 44px` | PASS |

**결론**: 주요 인터랙티브 요소에 44px 최소 터치 타겟이 일관적으로 적용됨.

---

## 수정 파일 목록

| 파일 | 수정 내용 |
|------|---------|
| `frontend/src/presentation/pages/alert-settings/use-alert-crud.ts` | 알림 삭제 성공 시 success 메시지 추가 |
| `frontend/src/presentation/pages/RouteSetupPage.tsx` | 경로 삭제 성공 시 toast 추가 + 경로 목록 뷰에 ToastContainer 렌더링 |
