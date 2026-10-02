# Alert System - Auto E2E Review Checklist

> 8시간 주기 자동 리뷰용. 이전 라운드 결과를 이어받아 진행.

## 프로젝트 컨텍스트

| 항목 | 값 |
|------|-----|
| 스택 | React 18 + NestJS + TypeScript |
| DB | Supabase (alert_system 스키마) |
| 배포 | Vercel (FE) + AWS ECS Fargate (BE) |
| Frontend URL | https://frontend-xi-two-52.vercel.app |
| Backend URL | https://d1qgl3ij2xig8k.cloudfront.net |

---

## Phase 0: 직전 라운드가 main에 도달했는지 확인 (최우선)

> 2026-09-15 신설. 계기: 09-14 16:00 라운드의 수정 2건이 PR #271에 묶인 채 24시간
> 머지되지 않았고, 다음 라운드는 그 사실을 모른 채 "이전 미해결 21건"만 이어받았다.
> 리포트가 "수정 완료"라고 적혀 있어도 main에 없을 수 있다.

```bash
# 1) 직전 리포트가 적은 테스트 수와 지금 실측값을 비교한다 (다르면 미도달 신호)
cd frontend && npm test 2>&1 | grep -E "Test Files|Tests "

# 2) 직전 리포트가 신설했다는 심볼/파일이 실제로 있는지 본다
grep -rn "<직전 라운드가 만든 함수명>" frontend/src

# 3) 열린 자동리뷰 PR이 남아 있는지 본다
GH_TOKEN=$(gh auth token --user Young-000) gh pr list --state open
```

**미도달이면**: 해당 PR의 검사 상태를 보고, 전부 초록 + `mergeable=MERGEABLE`이면
`gh pr merge <N> --squash --admin --delete-branch`로 올린 뒤 **머지 후 다시 테스트를 돌려**
초록을 확인하고 이번 라운드를 시작한다.
`CONFLICTING`이면 머지하지 말고 미해결로 기록한다 (낡은 브랜치는 이후 수정을 되돌릴 수 있다).

> ⚠️ `mergeStateStatus=BLOCKED`인데 검사가 전부 초록이면 브랜치 보호 이름 불일치다
> (필수 `CI / frontend` ≠ 실제 `frontend`). `--admin`이 기록된 우회로다.

---

## Phase 1: Build & Lint (자동 수정)

### Frontend (`frontend/`)
```bash
cd frontend
npm run lint 2>&1        # 에러 0 필요
npm run type-check 2>&1  # tsc --noEmit 에러 0 필요
npm run build 2>&1       # 빌드 성공 필요
npm test 2>&1            # 테스트 통과
```

### Backend (`backend/`)
```bash
cd backend
npm run lint 2>&1
npm run build 2>&1
npm test 2>&1
```

**자동 수정**: lint --fix, 타입 에러 수정, 빌드 에러 수정
**통과 기준**: lint 0, type 0, build 성공, test 80%+

---

## Phase 2: Security

| # | 체크 | 설명 |
|---|------|------|
| 2-1 | 환경변수 노출 | .env 커밋 여부, 하드코딩된 키 |
| 2-2 | API 인증 | JWT 검증, 미보호 엔드포인트 |
| 2-3 | 입력 검증 | DTO validation, SQL injection 방지 |
| 2-4 | CORS 설정 | 허용 도메인 확인 |
| 2-5 | Supabase RLS | alert_system 스키마 RLS 활성화 |

---

## Phase 3: Performance

| # | 체크 | 설명 |
|---|------|------|
| 3-1 | 번들 사이즈 | Frontend gzip < 500KB (앱인토스 제한) |
| 3-2 | 코드 스플리팅 | lazy loading 적용 확인 |
| 3-3 | N+1 쿼리 | Backend API 쿼리 최적화 |
| 3-4 | 외부 API 캐싱 | 날씨/대기질/교통 API 캐시 여부 |
| 3-5 | 이미지 최적화 | WebP, lazy loading, 적절한 크기 |

---

## Phase 4: UX - 핵심 사용자 플로우

### Flow 1: 회원가입 → 온보딩
- [ ] `/login` 접속 → 로그인 폼 표시
- [ ] Supabase Auth 로그인 → `/auth/callback` → 리다이렉트
- [ ] 최초 사용자 → `/onboarding` 표시
- [ ] 온보딩 완료 → 메인 페이지

### Flow 2: 경로 설정 (`/routes`)
- [ ] 비로그인 → 로그인 유도 메시지
- [ ] 템플릿 선택 → 저장 → `/commute`로 리다이렉트
- [ ] "직접 만들기" → 커스텀 폼 표시 (다른 UI 숨김)
- [ ] 체크포인트 추가/삭제 (최소 2개 유지)
- [ ] 경로 저장 → 목록에 표시
- [ ] 저장된 경로 클릭 → `/commute?routeId=xxx`
- [ ] 수정/삭제 동작 정상

### Flow 3: 출퇴근 트래킹 (`/commute`)
- [ ] 경로 선택 → 세션 시작
- [ ] 스톱워치 모드 → 시간 기록
- [ ] 체크포인트 도착 → 시간 기록 + 다음 단계
- [ ] 세션 완료 → 대시보드 이동
- [ ] 세션 취소 → 확인 후 데이터 삭제

### Flow 4: 알림 설정 (`/alerts`)
- [ ] 새 알림 생성 → 폼 표시
- [ ] 알림 저장 → 목록 표시 + EventBridge 스케줄 생성
- [ ] 활성화/비활성화 토글
- [ ] 알림 삭제 → 확인 후 제거

---

## Phase 5: UX - 에러 복구

| # | 시나리오 | 기대 동작 |
|---|---------|----------|
| 5-1 | 네트워크 끊김 | 오프라인 배너 표시, 재시도 안내 |
| 5-2 | API 500 에러 | 사용자 친화적 에러 메시지, 재시도 버튼 |
| 5-3 | 인증 만료 | 자동 로그아웃 + 로그인 리다이렉트 |
| 5-4 | 존재하지 않는 URL | 404 페이지 표시 |
| 5-5 | 외부 API 실패 (날씨 등) | 폴백 메시지, 나머지 기능 정상 동작 |
| 5-6 | 폼 유효성 실패 | 필드별 에러 메시지, 입력 유지 |
| 5-7 | 중복 요청 | 버튼 disabled, 중복 방지 |
| 5-8 | 뒤로가기/새로고침 | 상태 유지 또는 graceful recovery |

---

## Phase 6: UX - 상태 표시 일관성

| # | 체크 | 설명 |
|---|------|------|
| 6-1 | 로딩 상태 | 모든 API 호출 시 스피너/스켈레톤 |
| 6-2 | 빈 상태 | 데이터 없을 때 안내 메시지 + CTA |
| 6-3 | 에러 상태 | 에러 시 재시도 버튼 |
| 6-4 | 성공 피드백 | 저장/삭제 시 토스트 메시지 |
| 6-5 | 버튼 상태 | enabled/disabled/loading 구분 |
| 6-6 | 모바일 터치 | 터치 타겟 44px 이상 |

---

## Phase 7: DB & 스키마

| # | 체크 | 설명 |
|---|------|------|
| 7-1 | 스키마 사용 | `alert_system` 스키마만 사용 |
| 7-2 | public 테이블 | public 스키마에 앱 테이블 없음 |
| 7-3 | RLS 정책 | 사용자 데이터 테이블 RLS 활성화 |
| 7-4 | 마이그레이션 | 미적용 마이그레이션 없음 |

---

## Phase 8: PWA & 알림 (alert-system 전용)

| # | 체크 | 설명 |
|---|------|------|
| 8-1 | Service Worker | 등록 + 캐시 전략 정상 |
| 8-2 | 오프라인 모드 | 기본 페이지 접근 가능 |
| 8-3 | Push 알림 | 구독 + 수신 동작 |
| 8-4 | EventBridge | 스케줄 생성/수정/삭제 정상 |
| 8-5 | Solapi 알림톡 | 템플릿 ID 연동 확인 |

---

## 결과 저장 형식

파일: `.claude/e2e-reports/auto-review/{timestamp}.md`

```markdown
# Auto E2E Review - {date} {time}

## 이전 결과 이어받기
- 이전 리뷰: {previous_file}
- 이전 미해결: N건

## 이번 리뷰 결과
| Phase | 상태 | 수정 | 미해결 |
|-------|------|------|--------|

## 수정 내역
1. [파일:라인] 설명

## 남은 이슈 (다음 리뷰에서 처리)
1. [이슈] 이유
```
