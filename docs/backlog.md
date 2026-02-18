# Backlog — Phase 4: 품질/테스트 강화 + 잔여

> 목표: 성능 최적화, 백엔드 통합 테스트, 인프라 개선
> 현재 테스트: Frontend 394, Backend 539 (총 933)

## Next

| ID | 항목 | 노력 | 우선순위 | 설명 |
|----|------|------|----------|------|
| Q-4 | **성능 프로파일링 + 최적화** | M | P1 | Lighthouse CI 연동, LCP/CLS/INP 측정, 병목 해소. 목표: Lighthouse 90+ |
| Q-5 | **백엔드 통합 테스트** | M | P1 | 서비스 레이어 통합 테스트 확대. 실제 DB 연동 테스트 (sqlite) |

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
- [x] **Cycle 1-10**: 종합 감사 → 품질 기반 → 코드 구조 → 품질 심화 → UX → 포커스트랩 → 홈 인지부하 → DX → Backend 테스트 → 모니터링
- [x] **Cycle 11-17**: 프로젝트 리뷰 → react-query → 브리핑 위젯 → 스트릭 → 주간 리포트 → Tailwind 기반
- [x] **코드 품질 체크리스트 100%** (PR #37) — 10개 항목 전체 PASS
- [x] **Q-1**: E2E 테스트 기반 구축 (PR #38) — 135 E2E tests
- [x] **Q-2**: 프론트엔드 컴포넌트 테스트 확대 (PR #39) — 377 tests
- [x] **Q-3**: 번들 사이즈 최적화 (PR #40) — 90KB→13KB gzip
- [x] **Q-6**: 보안 감사 + 취약점 수정 (PR #41)
- [x] **Q-7**: 에러 모니터링 체계 (PR #42) — Error Logger + ErrorBoundary 고도화
- [x] **Q-8**: 접근성 자동 테스트 (PR #42) — CI accessibility job

---
*마지막 업데이트: 2026-02-18 (Cycle 22 시작)*
