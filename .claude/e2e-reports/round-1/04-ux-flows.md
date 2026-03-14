# Phase 4: UX 핵심 사용자 플로우 점검

- 점검일: 2026-03-14
- 점검 방식: 코드 리뷰 기반

---

## Flow 1: 회원가입 / 로그인 / 온보딩

### 로그인 페이지 (`/login` - LoginPage.tsx)
- [x] 로그인 폼 렌더링 (이메일 + 비밀번호)
- [x] 회원가입 모드 전환 (`toggleMode`로 login/register 토글)
- [x] 회원가입 시 이름 + 전화번호 필드 추가 표시
- [x] `required` 속성, `minLength`, `pattern` 등 입력 검증
- [x] 로딩 상태 표시 (`isLoading` - 스피너 + 버튼 비활성화)
- [x] 에러 메시지 표시 (`role="alert"`)
- [x] Google OAuth 로그인 지원 (상태 체크 후 조건부 표시)
- [x] 비밀번호 표시/숨기기 토글 (`showPassword`)
- [x] 회원가입 성공 -> `/onboarding` 리다이렉트
- [x] 로그인 성공 -> `/` 리다이렉트
- [x] `notifyAuthChange()` 호출하여 전역 인증 상태 갱신
- [x] `safeSetItem`으로 localStorage에 토큰/유저 정보 저장
- [x] useEffect cleanup (`isMounted` 패턴)

### Auth Callback 페이지 (`/auth/callback` - AuthCallbackPage.tsx)
- [x] fragment hash에서 token/userId 추출 (보안: query string 대신 hash 사용)
- [x] 에러 시 3초 후 `/login`으로 리다이렉트
- [x] 성공 시 500ms 후 `/alerts`로 리다이렉트
- [x] `window.history.replaceState`로 URL에서 토큰 정보 제거
- [x] processing/success/error 3단계 상태 표시
- [x] cleanup에서 `clearTimeout`

### 온보딩 페이지 (`/onboarding` - OnboardingPage.tsx)
- [x] 비로그인 시 `/login`으로 리다이렉트
- [x] 5단계 플로우: welcome -> commute-question -> transport -> duration -> complete
- [x] "건너뛰기" 버튼 (onboardingCompleted 저장 후 홈으로)
- [x] 출퇴근 여부 질문 (없음 -> complete로 스킵)
- [x] 교통수단 선택 (subway/bus/mixed/car/walk)
- [x] 소요시간 슬라이더 + 프리셋 버튼
- [x] 경로 자동 생성 (출근 + 퇴근 역순)
- [x] 완료 후 알림 설정 / 트래킹 / 홈 네비게이션 제공
- [x] 진행률 바 (progressbar role + aria)
- [x] 에러 처리 (경로 생성 실패)

**결과: 이상 없음**

---

## Flow 2: 경로 설정 (`/routes` - RouteSetupPage.tsx)

### 비로그인 처리
- [x] `userId` 없으면 `AuthRequired` 컴포넌트 표시 (로그인 링크 포함)

### 경로 목록 화면 (RouteListView.tsx)
- [x] 빈 상태 UI ("경로가 없어요" + 경로 추가 버튼)
- [x] 경로 탭 필터 (전체/출근/퇴근) - role="tablist"
- [x] 필터된 결과 없을 때 메시지 표시
- [x] 로드 에러 시 "다시 시도" 버튼
- [x] "+ 새 경로" 버튼 (`onStartCreating`)

### 경로 카드 (RouteCard.tsx)
- [x] 카드 클릭 -> 수정 모드 진입 (`onEdit`)
- [x] 출발 버튼 -> `/commute`로 navigate (routeId state 전달)
- [x] 수정 버튼 -> `onEdit`
- [x] 삭제 버튼 -> `onDelete`
- [x] 이벤트 버블링 없음 (출발/수정/삭제 버튼은 별도 div에 분리)

### 새 경로 생성 플로우
- [x] Step: select-type (출근/퇴근 선택)
- [x] Step: select-transport (교통수단 선택)
- [x] Step: select-station (역/정류장 검색)
- [x] Step: ask-more (추가 경유지 여부 - "네, 더 있어요" / "아니요, 이게 끝이에요")
- [x] Step: confirm (경로 미리보기 + 이름 입력 + 저장)

### 조건부 렌더링 검증
- [x] `isCreating`으로 생성 플로우 vs 목록 화면 분리 (최상위 if/return 구조 - 모순 없음)
- [x] step별 조건부 렌더링 (`{step === 'xxx' && ...}`) - 상호 배타적, 모순 없음

### 경유지 추가/삭제
- [x] 정류장 선택 시 검증 후 추가 (`handleSelectStopDirect`)
- [x] 삭제 시 최소 1개 유지 (`removeStop` - `prev.length <= 1`이면 에러 표시)
  - 1개 selectedStop = 집 + 경유지 + 회사 = 3개 체크포인트 -> 적절

### 수정 모드
- [x] `handleEditRoute`: 기존 체크포인트를 selectedStops로 변환
- [x] 수정 시 `createReverse` false 설정
- [x] 수정 완료 후 경로 다시 로드

### 삭제
- [x] 삭제 클릭 -> ConfirmModal 표시
- [x] 확인 -> API 호출 + 목록에서 제거
- [x] 취소 -> deleteTarget null

### 저장
- [x] `handleSave`: 중복 요청 방지 (`isSaving` 체크)
- [x] 검증 실패 시 에러 표시
- [x] 저장 후 자동 네비게이션 (`setTimeout(() => navigate('/'), 1500)`)
- [x] Toast dismiss 시 즉시 네비게이션 (`handleToastDismiss`)
- [x] 출근 경로 저장 시 퇴근 경로 자동 생성 옵션
- [x] 에러 세분화 (401, network, 기타)

### 상태 초기화
- [x] `startCreating`: 모든 관련 상태 초기화 (selectedStops, search, error, warning, routeName, editingRoute, createReverse)
- [x] `cancelCreating`: 동일하게 모든 상태 초기화

**결과: 이상 없음**

---

## Flow 3: 출퇴근 트래킹 (`/commute` - CommuteTrackingPage.tsx)

### 인증 및 데이터 로드
- [x] 비로그인 시 `/login`으로 리다이렉트
- [x] 기존 in-progress 세션 확인 -> 이어서 트래킹
- [x] navState.routeId로 경로 지정 -> 자동 세션 시작
- [x] searchMode로 PWA shortcut 지원 (morning/evening)
- [x] 경로/세션 없으면 홈으로 리다이렉트
- [x] `isMounted` cleanup 패턴

### 타이머
- [x] 1초 interval 갱신
- [x] Page Visibility API로 백그라운드 복귀 시 즉시 갱신
- [x] cleanup에서 interval 정리 + visibilitychange 리스너 제거
- [x] 시/분/초 포맷팅

### 체크포인트 타임라인
- [x] 각 체크포인트 상태 표시 (completed/current/pending)
- [x] 기록된 체크포인트의 대기 시간 표시
- [x] 현재 체크포인트 라벨 ("현재")

### 세션 완료
- [x] "도착" 버튼 -> 미기록 체크포인트 자동 기록 (병렬) -> 세션 완료
- [x] 중복 요청 방지 (`isCompleting` 체크 + 상태 확인)
- [x] 완료 화면: 소요 시간 + 예상 대비 비교 + "홈으로" 버튼
- [x] 에러 세분화 (401 vs 일반)
- [x] 에러 시 재시도 / 로그인 버튼 제공

### 세션 취소
- [x] 뒤로가기 / "기록 취소" -> ConfirmModal 표시
- [x] 확인 -> API 호출 + 홈으로 리다이렉트
- [x] 브라우저 닫기 시 경고 (beforeunload)

**결과: 이상 없음**

---

## Flow 4: 알림 설정 (`/alerts` - AlertSettingsPage.tsx)

### 비로그인 처리
- [x] `userId` 없으면 `AuthRequired` 컴포넌트 표시

### 초기 로딩
- [x] `isLoadingAlerts` 시 스피너 + 메시지 표시
- [x] 로드 에러 시 에러 메시지 + "다시 시도" 버튼
- [x] react-query 기반 데이터 패칭 (useAlertsQuery, useRoutesQuery)

### 알림 목록 (AlertList.tsx)
- [x] 알림 카드: 시간 배지 + 이름 + 유형 태그 + 연결 경로
- [x] 토글 스위치 (`onChange -> onToggle`)
  - [x] 낙관적 업데이트 + 실패 시 롤백
  - [x] 중복 토글 방지 (`togglingIds`)
- [x] 수정 버튼 -> EditAlertModal 표시
- [x] 삭제 버튼 -> DeleteConfirmModal 표시

### 알림 생성 (Wizard)
- [x] 알림 없을 때 자동 표시 / "+ 새 알림 추가" 버튼으로 수동 표시
- [x] 5단계: type -> transport -> station -> routine -> confirm
- [x] 단계별 조건부 렌더링 (`{wizard.step === 'xxx' && ...}`) - 상호 배타적, 모순 없음
- [x] 네비게이션 버튼 (뒤로/다음/제출)
- [x] 경로에서 가져오기 기능 (`importFromRoute`)
- [x] 중복 알림 검증 (`checkDuplicateAlert`)
- [x] 중복 발견 시: 기존 알림 수정 / 시간 변경 옵션

### 알림 저장
- [x] API 호출 + `reloadAlerts()` (react-query invalidate)
- [x] 성공 토스트 -> TOAST_DURATION_MS 후 위저드 초기화
- [x] 에러 세분화 (401, 403, 기타)
- [x] 중복 요청 방지 (`isSubmitting`)

### 알림 수정 (EditAlertModal.tsx)
- [x] 이름 + 시간 수정 폼
- [x] focus trap + ESC 키 닫기
- [x] 모달 overlay 클릭 닫기 + `e.stopPropagation()`
- [x] 저장 중 스피너 + 버튼 비활성화
- [x] 이름 빈 값일 때 저장 비활성화

### 알림 삭제
- [x] 삭제 확인 모달
- [x] 확인 -> API 호출 + reloadAlerts + deleteTarget 초기화
- [x] ESC 키 닫기 (useEffect 리스너)

### 빠른 날씨 알림
- [x] 이미 존재 시 에러 메시지 + 목록으로 스크롤
- [x] 생성 후 목록 갱신 + 스크롤

**결과: 이상 없음**

---

## 특별 주의 항목 점검 결과

### JSX 조건부 렌더링 모순 체크
- **RouteSetupPage**: `isCreating` 기반 if/return 구조로 경로 목록 vs 생성 플로우 완전 분리. Step별 `{step === '...' && ...}` 패턴은 상호 배타적. **모순 없음.**
- **AlertSettingsPage**: `wizard.step === '...'` 패턴, `shouldShowWizard` 조건 분리. **모순 없음.**
- **CommuteTrackingPage**: `isLoading` / `session?.status === 'completed'` / active tracking 순서로 if/return. **모순 없음.**
- **OnboardingPage**: step별 `{step === '...' && ...}` 패턴. **모순 없음.**

### 이벤트 핸들러 검증
- **RouteCard**: 카드 body 클릭(수정)과 action 버튼(출발/수정/삭제)이 별도 DOM 구조 -> 버블링 문제 없음
- **AlertList**: toggle/edit/delete 핸들러가 각각 독립적으로 바인딩 -> 정상
- **EditAlertModal**: overlay `onClick={onCancel}` + 내부 `e.stopPropagation()` -> 정상

### 상태 관리 검증
- **RouteSetupPage `startCreating`/`cancelCreating`**: 모든 관련 상태(selectedStops, error, warning, routeName, editingRoute, createReverse, search) 함께 초기화 -> 정상
- **AlertSettingsPage handleSubmit**: 성공 후 TOAST_DURATION_MS 뒤에 위저드 상태 전체 초기화 -> 정상
- **CommuteTrackingPage**: session/route 상태가 loadData에서 일관되게 설정 -> 정상
- **useAlertCrud**: alerts를 react-query data와 동기화 (`useEffect` 기반), 낙관적 업데이트 후 실패 시 롤백 -> 정상

---

## 발견된 이슈

**없음** - 모든 4개 핵심 플로우가 코드 레벨에서 올바르게 구현되어 있음.

---

## 요약

| 항목 | 상태 |
|------|------|
| Flow 1: 회원가입/로그인/온보딩 | PASS |
| Flow 2: 경로 설정 | PASS |
| Flow 3: 출퇴근 트래킹 | PASS |
| Flow 4: 알림 설정 | PASS |
| JSX 모순 조건 | 없음 |
| 이벤트 버블링 문제 | 없음 |
| 상태 초기화 누락 | 없음 |
| 수정 건수 | 0건 |
