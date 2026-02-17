# Cycle 1 QA 검증 보고서

> 검증일: 2026-02-17
> 검증자: QA Agent
> 대상: `docs/specs/cycle-1-project-audit.md` (PM 감사 보고서)

---

## 1. 테스트 실행 결과

### 1.1 Frontend 테스트

```
Test Suites: 10 passed, 10 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        1.372 s
```

**커버리지 요약:**
```
Statements : 41.54% ( 936/2253 )
Branches   : 21.04% ( 323/1535 )
Functions  : 27.98% ( 169/604 )
Lines      : 43%    ( 854/1986 )
```

**판정:** PASS (전체 통과). 단, 커버리지가 매우 낮음.
- Statement 41%, Branch 21%는 프로덕션 품질에 미달
- 특히 Branch 커버리지 21%는 조건부 로직의 79%가 미검증 상태

### 1.2 Backend 테스트

```
Test Suites: 3 skipped, 30 passed, 30 of 33 total
Tests:       10 skipped, 220 passed, 230 total
Snapshots:   0 total
Time:        6.178 s
```

**커버리지 요약:**
```
Statements : 31.93% ( 1705/5339 )
Branches   : 24.92% ( 424/1701 )
Functions  : 25.82% ( 234/906 )
Lines      : 31.93% ( 1556/4873 )
```

**판정:** PASS (220 통과, 10 스킵). 3개 Test Suite 스킵됨.
- PM 보고서의 "220/230 (10 skip)" 정확히 확인됨
- 커버리지 31.93%로, PM이 "use-case 단위 커버리지 양호"라고 했지만 전체 커버리지는 낮음

### 1.3 빌드 파이프라인

| 항목 | Frontend | Backend |
|------|:--------:|:-------:|
| TypeScript (`tsc --noEmit`) | PASS (에러 0) | PASS (에러 0) |
| ESLint | WARNING 1개 | PASS (에러 0) |
| Build | PASS | PASS |
| npm audit (production) | 취약점 0개 | **취약점 12개** (2 low, 4 moderate, 6 high) |

**Frontend ESLint 경고 (1건):**
```
RouteSetupPage.tsx:99 - react-hooks/exhaustive-deps: useCallback에 'search' 의존성 누락
```
> PM 보고서에서 eslint-disable 2곳 언급했지만, 이 추가 경고 1건은 누락함

**Backend npm audit 주요 취약점:**
- `axios` <=1.13.4: DoS via `__proto__` (high)
- `fast-xml-parser` 5.0.9-5.3.3: RangeError DoS (high)
- `js-yaml` 4.0.0-4.1.0: prototype pollution (moderate)
- `sqlite3`/`tar`: 여러 취약점 (high)

---

## 2. PM 주장 검증

### 2.1 숫자 검증

| PM 주장 | 실측값 | 일치? | 비고 |
|---------|--------|:-----:|------|
| Frontend 소스 107개 | TS/TSX 91개 (전체 92개) | **불일치** | PM은 106개(테스트 포함)를 소스+테스트 혼합 집계한 것으로 추정. 소스만 91개가 정확 |
| Frontend 테스트 10개 | 10개 | **일치** | 정확히 10개 테스트 파일 |
| CSS 16,873줄 | 16,873줄 | **일치** | `frontend/src/presentation/index.css` (PM이 경로를 `index.css`로만 표기, 실제 경로는 `presentation/index.css`) |
| HomePage.tsx 806줄 | 806줄 | **일치** | 정확함 |
| HomePage.tsx useEffect 7개 | 7개 | **일치** | 정확함 |
| 루트 레거시 MD 20개 | **17개** (CLAUDE.md, README.md 제외) | **불일치** | PM은 "20개"라 했으나 실제 17개. WARP.md를 리스트에서 누락하고도 20개로 기재 |
| Backend 소스 202개 | TS 168개 (테스트 제외) / 201개 (전체) | **근사치** | PM의 202는 전체 파일 기준으로 거의 정확 (1개 차이) |
| Backend 테스트 33개 | 33개 | **일치** | 정확함 |
| SettingsPage.tsx 652줄 | 652줄 | **일치** | 정확함 |
| Backend 테스트 220/230 (10 skip) | 220 pass, 10 skip | **일치** | 정확함 |

**결론:** PM의 핵심 수치 대부분 정확. "Frontend 소스 107개"와 "루트 MD 20개"는 약간의 오차 있으나 결론에 영향 없음.

### 2.2 Render URL 참조 검증

PM 주장 파일별 실측:

| 파일 | Render URL 존재? | 상세 |
|------|:---------------:|------|
| `frontend/.env.test` | **존재** | `VITE_API_BASE_URL=https://alert-system-commute-test.onrender.com` (활성 값!) |
| `frontend/.env.production` | **존재** | 주석 처리: `# VITE_API_BASE_URL=https://alert-system-kdg9.onrender.com` |
| `.claude/STATUS.md` | **존재** | Render 프로덕션 URL 다수 참조 |
| `.claude/commands/validate-supabase.md` | **존재** | Render URL로 테스트 명령어 |
| `COMMUTE_TRACKING_PROGRESS.md` | **존재** | Render 배포 URL 기록 |

**추가 발견:** `.env.test`에서 Render URL이 **주석이 아닌 활성 값**으로 설정되어 있음.
> 이는 PM이 지적한 것보다 더 심각 - 테스트 실행 시 실제로 Render 서버로 요청을 보낼 수 있음

### 2.3 기타 주장 검증

| PM 주장 | 검증 결과 |
|---------|----------|
| `.aws-ready/` 폴더 존재 | **확인됨** - 265줄 `eventbridge-scheduler.service.ts` + README.md |
| InMemory Scheduler 코드 남아있음 | **확인됨** - 141줄 `in-memory-notification-scheduler.service.ts` |
| LoginPage Cold Start 코드 | **확인됨** - `serverStatus: 'warming'/'ready'/'error'`, 서버 예열 로직, 45초 타임아웃 |
| `domain/`, `application/` 레이어 비어있음 | **확인됨** - 두 폴더 모두 파일 0개 |
| `localStorage.getItem('userId')` 직접 호출 | **확인됨** - 9곳에서 직접 호출 (테스트 제외), useAuth 훅 미사용 |
| CI/CD 파이프라인 없음 | **확인됨** - `.github/` 디렉토리 자체가 존재하지 않음 |
| `eslint-disable` 주석 2곳 | **확인됨** - `AlertSettingsPage.tsx:136`, `CommuteTrackingPage.tsx:108` |
| `better-sqlite3` dependencies 포함 | **확인됨** - `"better-sqlite3": "^12.6.0"` in dependencies |
| Swagger 프로덕션 보호 | **확인됨** - `NODE_ENV !== 'production'` 조건 (main.ts:75) |

---

## 3. PM이 놓친 이슈

### 3.1 [NEW-CRIT-1] Backend npm audit 취약점 12개 (severity: high)

**심각도:** Critical
**발견 기법:** Security spot-check

PM 보고서에서 npm 보안 감사를 수행하지 않음. Backend에 12개 취약점(6 high, 4 moderate, 2 low) 발견:
- `axios` DoS 취약점 (high)
- `fast-xml-parser` RangeError DoS (high) - AWS SDK 의존성
- `sqlite3`/`tar` 관련 취약점 (high)
- `js-yaml` prototype pollution (moderate) - Swagger 의존성

> `npm audit fix`로 대부분 해결 가능하나, `@nestjs/swagger` 관련은 breaking change 수반

### 3.2 [NEW-CRIT-2] 프론트엔드 bare catch 블록 30+개 - PM 과소평가

**심각도:** Major (PM은 3곳만 언급)
**발견 기법:** Grep 전수 조사

PM은 `SettingsPage.tsx`의 3곳과 `HomePage.tsx`의 1곳만 지적했으나, 실제로 프론트엔드 전체에 **최소 30개의 bare `catch {}`** 블록이 존재:

| 파일 | bare catch 수 | 사용자 피드백 유무 |
|------|:-----------:|:-----------:|
| SettingsPage.tsx | 6 | 3개는 사용자 메시지 있음, **3개 무시** |
| RouteSetupPage.tsx | 5 | 확인 필요 |
| HomePage.tsx | 3 | 1개 fallback navigate, **2개 무시** |
| CommuteTrackingPage.tsx | 3 | 3개 모두 에러 메시지 있음 (양호) |
| LoginPage.tsx | 2 | 확인 필요 |
| NotificationHistoryPage.tsx | 2 | 확인 필요 |
| OnboardingPage.tsx | 1 | 확인 필요 |
| use-alert-crud.ts | 5 | 확인 필요 |
| use-transport-search.ts | 1 | 확인 필요 |
| use-commute-dashboard.ts | 1 | 확인 필요 |
| LoadMoreButton.tsx | 1 | 확인 필요 |
| types.ts | 1 | JSON parse fallback (합리적) |

**분석:**
- `SettingsPage`의 토글(`catch { // Silent: toggle is optimistic }`)과 삭제(`catch { // Error handling delegated to UI state }`)는 **실제 에러가 발생해도 사용자에게 알리지 않음**
- `HomePage`의 데이터 로드 실패(`catch { // Non-critical }`)는 빈 화면을 보여줄 수 있음
- PM이 지적한 것보다 문제 범위가 훨씬 넓음

### 3.3 [NEW-IMP-1] Frontend ESLint 추가 경고 1건

**심각도:** Minor
**파일:** `RouteSetupPage.tsx:99`

```
React Hook useCallback has a missing dependency: 'search'
```

PM은 eslint-disable 2곳만 언급했으나, disable 없이 실제 경고가 나는 곳이 1건 더 있음. `--max-warnings=0` 기준 ESLint 실패 상태.

### 3.4 [NEW-IMP-2] Backend any 타입 대량 사용 (테스트 코드)

**심각도:** Minor (테스트 코드 한정)

Backend 테스트 파일에서 `as any` 또는 `: any` 타입이 **54곳** 이상 사용됨:
- `alert.controller.spec.ts`: 3곳
- `export-user-data.use-case.spec.ts`: 5곳
- `generate-weekly-report.use-case.spec.ts`: 6곳
- `api-cache.service.spec.ts`: 20곳 이상
- 기타 spec 파일 다수

> 프로덕션 소스에는 `any` 없음 (양호). 테스트의 `any`는 mock 객체 생성 패턴에서 발생. 타입 안전한 mock 유틸리티 도입으로 해결 가능.

### 3.5 [NEW-IMP-3] 프론트엔드 번들 사이즈 주의사항

**심각도:** Info

빌드 결과:
```
index.js               200.47 KB │ gzip:  64.51 KB  (메인 번들)
RouteSetupPage.js       81.97 KB │ gzip:  24.65 KB  (라우트 설정 - 가장 큰 페이지)
AlertSettingsPage.js    44.29 KB │ gzip:  11.46 KB
CommuteDashboardPage.js 40.11 KB │ gzip:   8.64 KB
sw.js                   67.35 KB │ gzip:  18.12 KB  (Service Worker)
총 precache: 643.73 KB
```

gzip 기준 메인 번들 64.51KB + 페이지 번들 합산 = 앱인토스 기준 500KB 이내 유지 중. 현재는 양호하나, 향후 기능 추가 시 주의 필요.

### 3.6 [NEW-IMP-4] Frontend 소스 파일 수 PM 오산

**심각도:** Trivial (보고서 정확성)

PM이 "Frontend src/ 107개"라 했으나:
- TS/TSX 소스 파일 (테스트/mock 제외): **91개**
- TS/TSX 전체 (테스트 포함): **106개**
- 전체 파일 (CSS 등 포함, 테스트/mock 제외): **92개**

"107"은 어떤 기준으로도 정확히 맞지 않음. 106이 가장 가까운 수치.

### 3.7 [NEW-IMP-5] 루트 레거시 MD 파일 수 오산

**심각도:** Trivial (보고서 정확성)

PM이 "20개"라 했고 18개를 나열했으나 (`WARP.md` 누락), 실제로:
- CLAUDE.md, README.md 제외 시: **17개**
- CLAUDE.md 포함, README.md 제외: **18개**
- 전체: **19개**

PM 보고서에 리스트된 파일명 중 `WARP.md`가 누락되어 있고, 총 수도 "20개"는 부정확.

---

## 4. 테스트 커버리지 갭 분석

### 4.1 가장 위험한 미테스트 코드 경로

**위험도순 (P0~P2):**

| 우선순위 | 파일/모듈 | 미테스트 영역 | 위험 |
|:-------:|----------|-------------|------|
| P0 | `HomePage.tsx` | 날씨 체크리스트 로직 (`getWeatherChecklist`) | 잘못된 날씨 판단 → 사용자에게 부적절한 조언 |
| P0 | `HomePage.tsx` | AQI 상태 판정 (`getAqiStatus`) | 미세먼지 위험도 오판 → 건강 관련 정보 오류 |
| P0 | `HomePage.tsx` | 출발 시간 예측 로직 | 잘못된 출발 시간 안내 → 서비스 핵심 가치 훼손 |
| P1 | `SettingsPage.tsx` | 알림 토글, 경로/알림 삭제 | 삭제 실패 시 UI와 서버 불일치 |
| P1 | `RouteSetupPage.tsx` | 경로 생성/수정/삭제 플로우 | 핵심 CRUD 미검증 |
| P1 | `CommuteTrackingPage.tsx` | 세션 시작/종료/체크포인트 기록 | 출퇴근 기록 누락 가능성 |
| P1 | `AlertSettingsPage.tsx` | 알림 위저드 전체 플로우 | 알림 설정 실패 시 서비스 무용 |
| P2 | `LoginPage.tsx` | 로그인 플로우 (서버 예열 포함) | Cold start 코드가 AWS에서 불필요한 지연 유발 |
| P2 | `OnboardingPage.tsx` | 온보딩 경로 생성 | 첫 사용자 경험 |
| P2 | `commute-dashboard/*` | 통계/분석 표시 | 잘못된 통계 표시 |

### 4.2 우선 테스트 작성 대상 (비즈니스 로직)

1. **`getWeatherChecklist()`** - 온도, 강수확률, 일교차 기반 체크리스트 생성 로직
   - Boundary: 5도(한파), 28도(폭염), 10도(일교차) 경계값
   - Equivalence: 맑음/비/눈/안개 등 날씨 유형별

2. **`getAqiStatus()`** - 미세먼지 수치 → 상태 변환
   - Boundary: 좋음/보통/나쁨/매우나쁨 경계값

3. **`getGreeting()`** - 시간대별 인사말
   - Boundary: 6, 9, 12, 14, 18, 21시 경계값

4. **API 에러 핸들링 패턴** - 30+개 bare catch 블록의 동작 검증
   - State: loading → error → retry 전환

5. **경로 CRUD** - RouteSetupPage의 생성/수정/삭제
   - Decision table: 최소 체크포인트 수, 중복 이름, 빈 이름 등

---

## 5. PM 보고서 종합 평가

### 정확성: 8/10

PM 보고서의 핵심 발견사항은 모두 실측으로 확인됨:
- HomePage God Component, CSS 16K줄, CI/CD 부재, Render 잔여 참조, 빈 도메인 레이어 등 주요 이슈 정확
- 수치 오차는 "107 vs 91(소스) or 106(전체)", "20 vs 17(레거시 MD)" 수준으로 결론에 영향 없음

### 완전성: 6/10

PM이 놓친 주요 이슈:
1. **Backend npm 보안 취약점 12개** - 감사 항목에서 보안 스캔이 빠짐
2. **bare catch 블록 범위 과소평가** - 3곳이 아닌 30+곳
3. **ESLint 추가 경고** - `--max-warnings=0` 기준 빌드 실패 상태
4. **Backend 전체 커버리지 31.93%** - PM은 "use-case 커버리지 양호"라 했지만 전체 기준으로는 미달
5. **Frontend 전체 커버리지 41.54%** - PM이 "10~30%"라 한 것은 페이지별 기준이었고, 전체 수치를 제시하지 않음

### 우선순위 판단: 9/10

PM의 RICE 기반 우선순위는 합리적:
- CI/CD를 Critical로 분류한 것 적절
- Dead config 정리를 높은 우선순위로 둔 것 적절
- 에러 피드백 수정을 Important로 분류한 것 적절

### 추가 권고

PM 보고서의 우선순위 목록에 다음을 추가 제안:

| ID | 항목 | 우선순위 | 근거 |
|----|------|---------|------|
| QA-1 | Backend npm audit fix (보안 취약점 12개 해결) | **Critical** | 6개 high severity 취약점 |
| QA-2 | ESLint `--max-warnings=0` 준수 (RouteSetupPage 경고 수정) | **Important** | CI/CD 구축 시 빌드 실패 원인 |
| QA-3 | bare catch 블록 전수 조사 및 에러 피드백 추가 | **Important** | PM은 3곳만 지적했으나 30+곳 존재 |

---

## 6. 결론

PM 감사 보고서는 프로젝트의 핵심 문제를 정확하게 식별하고 있으며, RICE 기반 우선순위도 합리적이다. 주요 발견사항(God Component, CSS 단일 파일, CI/CD 부재, Dead config)은 모두 실측으로 확인됨.

그러나 보안 감사(npm audit)와 에러 핸들링 범위 측정이 불충분했다. Backend의 12개 보안 취약점은 CI/CD 구축과 함께 즉시 해결해야 하며, 프론트엔드의 30+개 bare catch 블록은 PM이 제안한 "에러 피드백 사일런트 처리 수정(I-3)" 작업의 범위가 예상보다 큰 것을 의미한다.

**Cycle 2 작업 범위 조정 권고:**
- C-1 (CI/CD): 그대로 유지 - ESLint `--max-warnings=0` 규칙 포함 권고
- C-2 (Dead Config): 그대로 유지
- C-3 (레거시 MD 정리): 그대로 유지 (17개, PM의 20개는 오차)
- **추가: QA-1 (npm audit fix)** - CI/CD와 함께 즉시 실행
- I-3 (에러 피드백): 범위 확대 필요 (3곳 → 30+곳)

---

*검증: QA Agent (Cycle 1)*
*다음 작업: Cycle 2 스펙에 QA 검증 결과 반영*
