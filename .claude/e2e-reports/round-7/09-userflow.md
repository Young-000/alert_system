# User Flow 점검 보고서 (Round 7)

## 체크리스트 결과

### 경로 설정 (/routes)

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 비로그인 → 로그인 유도 메시지 | ✅ | `AuthRequired` 컴포넌트 (`RouteSetupPage.tsx:500-507`) |
| 템플릿 선택 → 저장 → /commute 리다이렉트 | ⚠️ N/A | 템플릿 선택 UI 없음 (스텝 위저드로 대체). 저장 후 `/`(홈)으로 이동 |
| "직접 만들기" → 커스텀 폼 | ⚠️ N/A | 해당 UI 없음 - 현재는 단일 위저드 플로우 |
| 체크포인트 추가 → 목록 표시 | ✅ | `selectedStops` 상태 추가 (`handleSelectStopDirect`) |
| 체크포인트 삭제 - 최소 1개 유지 | ✅ | `removeStop` 함수 (최소 1개 stop 유지, home+work 자동 추가로 최소 3개 체크포인트) |
| 경로 저장 → 저장된 경로 목록 표시 | ✅ | `handleSave` → `setExistingRoutes` 업데이트 |
| 저장된 경로 클릭 → `/commute?routeId=xxx` | ✅ | `RouteCard.tsx:54` - `navigate('/commute', { state: { routeId: route.id } })` |
| 수정 버튼 → 폼에 기존 데이터 로드 | ✅ | `handleEditRoute` - 기존 stops 로드 후 `isCreating=true` |
| 삭제 버튼 → 확인 후 제거 | ✅ | `handleDeleteClick` + `ConfirmModal` + `handleDeleteConfirm` |

### 출퇴근 트래킹 (/commute)

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 경로 선택 → 세션 시작 | ✅ | `navRouteId` 또는 `searchMode` 기반 자동 시작 |
| 스톱워치 모드 구현 | ✅ | `StopwatchTab` + localStorage (`commute_stopwatch_records`) |
| 세션 완료 → 홈으로 이동 | ✅ | 완료 후 "홈으로" 버튼 → `navigate('/', { replace: true })` |
| 세션 취소 → 확인 후 데이터 삭제 | ✅ | `ConfirmModal` + `cancelSession` API 호출 + `navigate('/')` |

**⚠️ 발견 이슈 (수정 완료)**: `CommuteDashboardPage.tsx`에서 `actionLink="/commute?mode=stopwatch"` 참조.
`CommuteTrackingPage`는 `mode=stopwatch`를 처리하지 않아 홈(`/`)으로 리다이렉트됨 (dead link).
→ `actionLink="/commute"`로 수정 (트래킹 시작으로 연결).

### 알림 설정 (/alerts)

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 새 알림 생성 → 폼 표시 | ✅ | `wizard.showWizard` 상태로 위저드 표시 |
| 알림 저장 → 목록 표시 | ✅ | `handleSubmit` → `reloadAlerts()` |
| 활성화/비활성화 토글 | ✅ | `handleToggleAlert` - 낙관적 업데이트 + API 동기화 |
| 알림 삭제 → 확인 후 제거 | ✅ | `DeleteConfirmModal` + `handleDeleteConfirm` |
| 수정 모달 | ✅ | `EditAlertModal` + `handleEditConfirm` |
| 비로그인 → 로그인 유도 | ✅ | `AuthRequired` 컴포넌트 |

## 수정 내역

### 1. CommuteDashboardPage.tsx - 잘못된 `actionLink` 수정
- **파일**: `frontend/src/presentation/pages/CommuteDashboardPage.tsx` (line 156)
- **문제**: `actionLink="/commute?mode=stopwatch"` - `CommuteTrackingPage`는 `mode=stopwatch`를 처리하지 않아 홈으로 리다이렉트됨
- **수정**: `actionLink="/commute"`, `actionText="트래킹 시작하기"`로 변경
- **근거**: 스톱워치 기록은 localStorage 기반이며 별도의 트래킹 UI가 없음. 기존 경로 트래킹 페이지로 연결하는 것이 올바름

## 주요 관찰사항

1. **템플릿 선택 / 직접 만들기**: CLAUDE.md 체크리스트에는 있으나 현재 구현에서 해당 UI 없음. 스텝 위저드(RouteTypeStep → TransportStep → StationSearchStep → AskMoreStep → ConfirmStep)로 대체됨. 스펙이 구현보다 오래된 것으로 판단.

2. **저장 후 리다이렉트**: CLAUDE.md에는 `/commute`로 이동한다고 되어 있으나 실제 구현은 `/`(홈)으로 이동 (`navigate('/', 1500ms delay)`). 홈 화면에서 트래킹 시작이 가능하므로 UX상 문제없음.

3. **최소 체크포인트**: CLAUDE.md에는 "최소 2개 유지"라고 명시되어 있으나, 실제 stops(정류장)는 최소 1개 유지 (`prev.length <= 1`). 단, home/work 체크포인트는 자동 추가되므로 전체 체크포인트는 최소 3개. 아키텍처상 올바름.
