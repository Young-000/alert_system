# Backlog

> RICE 기반 우선순위. 감사 결과: `docs/specs/cycle-1-project-audit.md`
> QA 검증: `docs/qa/cycle-1-qa-validation.md` | UX 리뷰: `docs/design/cycle-1-ux-review.md`

## Critical (Cycle 2 대상)

| ID | 항목 | 노력 | RICE | 출처 |
|----|------|------|------|------|
| C-1 | CI/CD 파이프라인 구축 (GitHub Actions: lint + typecheck + test + build) | M | 300 | PM |
| C-2 | Dead Config 정리 (Render URL, .aws-ready, InMemory Scheduler, Cold Start 코드) — 12개 파일 | M | 400 | PM+Dev |
| C-3 | 프로젝트 루트 레거시 문서 정리 (17개 MD 파일 아카이브/삭제) | S | 200 | PM |
| C-4 | **알림 페이지 비로그인 시 깨진 위저드 UI 수정** (P0) | S | 500 | PD |
| C-5 | **Backend npm audit fix (12취약점, 6 high)** | S | 450 | QA |

## Important (Cycle 2~3 대상)

| ID | 항목 | 노력 | RICE | 출처 |
|----|------|------|------|------|
| I-2 | CSS 모듈화 1단계 (페이지별 파일 분리, 16,873줄 해체) | L | 53 | PM |
| I-3 | 에러 피드백 사일런트 처리 수정 (**23곳 잔존**, catch 블록 전수 조사) | M | 400 | PM+QA+PD |
| I-5 | 핵심 비즈니스 로직 테스트 추가 (날씨 체크리스트, AQI, 경로 추천) | M | 107 | PM+QA |
| I-6 | 하드코딩 좌표 제거 (서울 고정 -> 사용자 위치/설정) | M | 128 | PM |
| I-7 | SettingsPage.tsx 탭별 컴포넌트 분리 (652줄) | M | 100 | PM |

## Nice-to-have (Cycle 5+)

| ID | 항목 | 노력 | RICE | 출처 |
|----|------|------|------|------|
| N-1 | Jest -> Vitest 마이그레이션 | M | 40 | PM |
| N-2 | SVG 아이콘 시스템 구축 (공유 Icon 컴포넌트) | M | 40 | PM |
| N-3 | 알림 기록 페이지 접근성 개선 (네비게이션 접근 경로) | S | 80 | PM+PD |
| N-4 | Backend Controller 테스트 추가 (0% 커버리지) | XL | 12.5 | PM |
| N-5 | eslint-disable 2곳 해결 (의존성 배열 수정) | S | 80 | PM |
| N-6 | Tailwind CSS 점진적 도입 (새 컴포넌트부터) | L | 17 | PM |
| N-7 | ElastiCache Redis 활성화 (BullMQ 큐) | L | 12.5 | PM |
| N-8 | Solapi 주간 리포트 템플릿 | M | 25 | PM |
| N-9 | 커스텀 도메인 (Route 53 + ACM) | M | 40 | PM |
| N-10 | 알림 발송 모니터링 대시보드 | L | 25 | PM |
| N-11 | 홈 인지 부하 감소 (9섹션 축약/접기) | L | 80 | PD |
| N-12 | 설정 내 경로/알림 기능 중복 해소 (바로가기 링크로 변경) | M | 100 | PD |
| N-13 | 모든 모달 포커스 트랩 적용 | M | 60 | PD |
| N-14 | 경로 저장 성공 피드백 (토스트) | S | 80 | PD |
| N-15 | Cron 스케줄 사람 언어 표현 ("매일 07:00") | S | 60 | PD |
| N-16 | QuickPresets 중복 제거 (위저드 1단계에만 배치) | S | 60 | PD |

## Later (사용자 기반 확보 후)

- [ ] 사용자 통계/분석 기능
- [ ] 알림 유형 확장 (택배, 일정 등)

## Won't Do (제거)

- ~~다국어 지원~~ (타겟이 한국 직장인, ROI 없음)

## Done

- [x] v1.0 Render 배포
- [x] v2.0 AWS 마이그레이션 (ECS Fargate, CloudFront, EventBridge)
- [x] Solapi 카카오 알림톡 연동
- [x] PWA Push 알림
- [x] 경로 설정 (템플릿/커스텀)
- [x] 출퇴근 트래킹
- [x] 드래그앤드롭 UI (@dnd-kit)
- [x] ESLint + 테스트 커버리지 개선 (PR #29)
- [x] 코드 리뷰 - 보안/품질/아키텍처 (PR #28)
- [x] 접근성 ScrollToTop 컴포넌트 (PR #26)
- [x] 품질 체크리스트 Round 5 - 20건 수정 (PR #25)
- [x] **Cycle 1: 종합 프로젝트 감사** (2026-02-17)
- [x] **Cycle 2: 품질 기반 구축** (2026-02-17) — CI/CD, Dead Config, 문서정리, P0, npm audit, 에러피드백 7건, WCAG, ESLint
- [x] **Cycle 3: 코드 구조 & 인증 통일** (2026-02-17) — HomePage 분리, useAuth 통일, AuthRequired, PageHeader, ARIA 탭

---
*마지막 업데이트: 2026-02-17 (Cycle 3 완료)*
