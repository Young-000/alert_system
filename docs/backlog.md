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

## Important — 전체 완료 ✅

모든 Important 항목이 Cycle 3~5에서 완료됨.

## Nice-to-have (잔여 — 인프라/외부 의존성)

| ID | 항목 | 노력 | RICE | 비고 |
|----|------|------|------|------|
| N-9 | 커스텀 도메인 (Route 53 + ACM) | M | 40 | 인프라 전용 |
| N-8 | Solapi 주간 리포트 템플릿 | M | 25 | 카카오 승인 대기 |
| N-6 | Tailwind CSS 점진적 도입 (새 컴포넌트부터) | L | 17 | 광범위 마이그레이션 |
| N-7 | ElastiCache Redis 활성화 (BullMQ 큐) | L | 12.5 | 인프라 전용 |

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
- [x] **Cycle 4: 품질 심화** (2026-02-17) — Silent failure 15곳 수정, SettingsPage 분리, 비즈니스 로직 테스트 135개 추가 (총 400개)
- [x] **Cycle 5: Important 완료 + UX 개선** (2026-02-17) — CSS 모듈화, useUserLocation 훅, eslint-disable 제거, 경로 저장 토스트, 설정 중복 해소
- [x] **Cycle 6: UX Polish** (2026-02-17) — 포커스 트랩 통일, Cron 한국어 표현, 알림 기록 접근성, QuickPresets 중복 제거, PD P1 해결 2건
- [x] **Cycle 7: 홈 인지 부하 감소** (2026-02-17) — 날씨/통계 접기 모드, useCollapsible 훅, CTA 뷰포트 내 표시
- [x] **Cycle 8: DX 개선** (2026-02-17) — Jest→Vitest 마이그레이션, SVG 아이콘 시스템 7개, 테스트 488개
- [x] **Cycle 9: Backend Controller 테스트** (2026-02-17) — 16개 컨트롤러 테스트 파일, 160개 신규 테스트, 총 648개
- [x] **Cycle 10: 알림 모니터링 대시보드** (2026-02-17) — 통계 API + 프론트엔드 컴포넌트, WCAG 접근성, 총 668개 테스트

---
*마지막 업데이트: 2026-02-17 (Cycle 10 완료 — 팀 루프 종료, Nice-to-have 12건 완료, 잔여 4건 인프라/외부)*
