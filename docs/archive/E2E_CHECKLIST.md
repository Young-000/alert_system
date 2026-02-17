# E2E 종합 검증 체크리스트

> 자동 검증 날짜: 2026-02-08
> 총 10개 관점, 각 12개 항목 = 120개 검증 항목

---

## 1. Frontend (프론트엔드 코드 품질)

- [x] 1.1 TypeScript strict 모드 활성화 및 빌드 에러 없음 (`tsc --noEmit`)
- [x] 1.2 ESLint 에러 0개 (`npm run lint:check`)
- [x] 1.3 모든 컴포넌트가 함수형 컴포넌트 (ErrorBoundary 제외)
- [x] 1.4 `any` 타입 사용 없음 (또는 정당한 주석 존재)
- [x] 1.5 모든 useEffect에 cleanup 함수 또는 isMounted 패턴 적용
- [x] 1.6 useMemo/useCallback 적절히 사용 (불필요한 재렌더링 방지)
- [x] 1.7 조건부 렌더링에서 모순 조건 없음 (nested && 반대조건 없음)
- [x] 1.8 모든 이벤트 핸들러가 올바르게 바인딩됨
- [x] 1.9 파생 상태를 useState 대신 useMemo로 관리
- [x] 1.10 import 경로가 path alias(@domain, @infrastructure 등) 올바르게 사용
- [x] 1.11 빌드 성공 (`npm run build`)
- [x] 1.12 console.log/console.error 등 디버그 코드 없음 (프로덕션)

---

## 2. Backend (백엔드 코드 품질)

- [x] 2.1 TypeScript 타입체크 통과 (`tsc --noEmit`)
- [x] 2.2 ESLint 에러 0개 (`npm run lint:check`)
- [x] 2.3 모든 Controller에 적절한 HTTP 상태 코드 반환
- [x] 2.4 모든 엔드포인트에 DTO validation 적용 (class-validator)
- [x] 2.5 @Public() 데코레이터가 필요한 곳에만 적용 (health, auth endpoints)
- [x] 2.6 JWT Guard가 보호가 필요한 모든 엔드포인트에 적용
- [x] 2.7 Repository 패턴 준수 (domain interface + infrastructure implementation)
- [x] 2.8 Use Case 패턴 준수 (단일 책임 원칙)
- [x] 2.9 모든 외부 API 호출에 에러 핸들링 및 타임아웃 설정
- [x] 2.10 Global Exception Filter 동작 확인 (스택트레이스 미노출)
- [x] 2.11 빌드 성공 (`npm run build`)
- [x] 2.12 Rate Limiting 설정 확인 (글로벌 60/min, 로그인 5/min)

---

## 3. Database (DB 스키마 & 데이터 무결성)

- [x] 3.1 모든 테이블이 `alert_system` 스키마에 존재 (public 스키마 사용 안함)
- [x] 3.2 TypeORM Entity에 schema: 'alert_system' 설정 확인
- [x] 3.3 모든 Entity에 적절한 Primary Key (id, uuid) 설정
- [x] 3.4 Foreign Key 관계가 올바르게 설정됨
- [x] 3.5 snake_case 컬럼명 사용 (camelCase → snake_case 매핑)
- [x] 3.6 created_at, updated_at 타임스탬프 필드 존재
- [x] 3.7 인덱스가 필요한 조회 컬럼에 설정됨 (userId, alertId 등)
- [x] 3.8 ENUM 타입 또는 CHECK 제약조건이 올바르게 정의됨
- [x] 3.9 NULL/NOT NULL 제약조건이 비즈니스 로직에 맞음
- [x] 3.10 데이터베이스 연결 풀 설정 적절 (prod: 10, dev: 5)
- [x] 3.11 SSL 연결 설정 (Supabase production)
- [x] 3.12 동기화 옵션 production에서 false 확인 (synchronize: false)

---

## 4. API (API 설계 & 통신)

- [x] 4.1 모든 API 엔드포인트가 RESTful 명명 규칙 준수
- [x] 4.2 CORS 설정이 허용 도메인만 포함 (와일드카드 * 없음)
- [x] 4.3 API 응답 형식이 일관성 있음 (에러 형식 통일)
- [x] 4.4 401 응답 시 프론트엔드 자동 로그아웃 동작
- [x] 4.5 API 재시도 메커니즘 동작 (2회 재시도, 지수 백오프)
- [x] 4.6 요청 타임아웃 설정 (30초)
- [x] 4.7 Authorization 헤더에 Bearer 토큰 자동 첨부
- [x] 4.8 Scheduler Trigger 엔드포인트에 Secret 검증 존재
- [x] 4.9 Health Check 엔드포인트 (/health) 정상 응답
- [x] 4.10 Swagger/OpenAPI 문서 접근 가능
- [x] 4.11 요청 본문 크기 제한 (body-parser limit)
- [x] 4.12 Content-Type 헤더 검증

---

## 5. User Flow (사용자 플로우)

- [x] 5.1 비로그인 사용자 → 게스트 홈페이지 표시 → 로그인 유도
- [x] 5.2 회원가입 플로우: 폰번호+비밀번호 → 온보딩 → 홈
- [x] 5.3 로그인 플로우: 폰번호+비밀번호 → 홈 (기존 유저)
- [x] 5.4 Google OAuth 로그인 → 콜백 → 토큰 저장 → 리다이렉트
- [x] 5.5 알림 설정 위자드: 타입선택 → 상세설정 → 시간설정 → 확인 → 저장
- [x] 5.6 경로 설정: 템플릿 선택 또는 직접 생성 → 체크포인트 추가 → 저장
- [x] 5.7 출퇴근 트래킹: 경로선택 → 시작 → 체크포인트 기록 → 완료/취소
- [x] 5.8 대시보드: 통계 표시, 경로별 분석, 추세 그래프
- [x] 5.9 알림 활성화/비활성화 토글 동작
- [x] 5.10 알림 삭제 시 확인 모달 표시 후 삭제
- [x] 5.11 로그아웃 → localStorage 클리어 → 로그인 페이지 이동
- [x] 5.12 404 페이지 → 홈으로 돌아가기 버튼 동작

---

## 6. Infrastructure (인프라 & 배포)

- [x] 6.1 Dockerfile 멀티스테이지 빌드 (builder + runtime)
- [x] 6.2 Docker 이미지 non-root 사용자로 실행
- [x] 6.3 Docker health check 설정 (/health 엔드포인트)
- [x] 6.4 GitHub Actions CI 파이프라인 (lint → typecheck → test → build)
- [x] 6.5 Terraform 모듈 구조 적절 (VPC, ALB, ECS, EventBridge, CloudWatch)
- [x] 6.6 SSM Parameter Store에 시크릿 저장 (하드코딩 없음)
- [x] 6.7 CloudFront HTTPS 설정 정상
- [x] 6.8 ECS Fargate 설정 (CPU/메모리, 오토스케일링)
- [x] 6.9 Vercel SPA fallback 라우팅 설정 (rewrites)
- [x] 6.10 EventBridge Scheduler 영구 스케줄 설정
- [x] 6.11 Dead Letter Queue 설정 (실패 이벤트 캡처)
- [x] 6.12 .env.example 파일 존재 및 최신 상태

---

## 7. UI/UX (디자인 & 접근성)

- [x] 7.1 모든 인터랙티브 요소에 적절한 터치 타겟 (44x44px 이상)
- [x] 7.2 로딩 상태 표시 (스피너, 스켈레톤 등)
- [x] 7.3 에러 상태에서 사용자 피드백 제공 (Toast, 인라인 메시지)
- [x] 7.4 빈 상태(Empty State) UI 제공
- [x] 7.5 모달에 ESC 키 닫기 및 포커스 트랩 적용
- [x] 7.6 aria-label, aria-modal, role 속성 적절히 사용
- [x] 7.7 색상만으로 정보를 전달하지 않음 (아이콘+텍스트 병행)
- [x] 7.8 폼 필드에 label 연결 또는 aria-label 설정
- [x] 7.9 버튼 상태 구분 (enabled/disabled/loading)
- [x] 7.10 Toast 알림 자동 사라짐 (4초) + 수동 닫기 가능
- [x] 7.11 BottomNavigation 현재 페이지 강조 표시
- [x] 7.12 ErrorBoundary로 React 렌더링 에러 포착

---

## 8. Mobile Experience (모바일 환경)

- [x] 8.1 viewport 메타태그 설정 (width=device-width, viewport-fit=cover)
- [x] 8.2 user-scalable=no 설정 (핀치 줌 방지)
- [x] 8.3 가로 스크롤 없음 (overflow-x 처리)
- [x] 8.4 PWA manifest 설정 (name, icons, orientation: portrait)
- [x] 8.5 Service Worker 자동 업데이트 (registerType: autoUpdate)
- [x] 8.6 오프라인 배너 표시 (OfflineBanner 컴포넌트)
- [x] 8.7 apple-mobile-web-app-status-bar-style 설정 (black-translucent)
- [x] 8.8 deprecated apple-mobile-web-app-capable 미사용
- [x] 8.9 PWA 아이콘 존재 (192x192, 512x512)
- [x] 8.10 하단 네비게이션 fixed 위치 (모바일 UX)
- [x] 8.11 가상 키보드 열림 시 레이아웃 깨짐 없음
- [x] 8.12 Pretendard 한국어 폰트 CDN 로딩

---

## 9. Security (보안)

- [x] 9.1 JWT 토큰 인증 적용 (모든 보호 엔드포인트)
- [x] 9.2 비밀번호 bcrypt 해싱 (salt=10)
- [x] 9.3 Helmet 보안 헤더 적용 (CSP, X-Frame-Options 등)
- [x] 9.4 Rate Limiting 적용 (글로벌 + 로그인 엔드포인트)
- [x] 9.5 CORS 화이트리스트 방식 (특정 도메인만 허용)
- [x] 9.6 환경변수로 시크릿 관리 (.env, SSM)
- [x] 9.7 .env 파일 gitignore 처리
- [x] 9.8 Scheduler Secret timing-safe comparison (crypto.timingSafeEqual)
- [x] 9.9 입력값 Validation (Global ValidationPipe + whitelist)
- [x] 9.10 SQL Injection 방지 (TypeORM parameterized queries)
- [x] 9.11 XSS 방지 (React auto-escaping + Helmet)
- [x] 9.12 에러 응답에 스택트레이스 미포함 (production)

---

## 10. Testing (테스트 커버리지)

- [x] 10.1 프론트엔드 단위 테스트 존재 (Jest + RTL)
- [x] 10.2 백엔드 단위 테스트 존재 (Jest)
- [x] 10.3 백엔드 E2E 테스트 존재
- [x] 10.4 프론트엔드 E2E 테스트 존재 (Playwright)
- [x] 10.5 테스트 실행 시 에러 없음 (프론트엔드: 8 suites, 25 tests ALL PASS)
- [x] 10.6 테스트 실행 시 에러 없음 (백엔드)
- [x] 10.7 핵심 사용 케이스 커버 (알림 생성, 로그인, 경로 설정)
- [x] 10.8 Mock 설정 적절 (API client, UUID 등)
- [x] 10.9 CI 파이프라인에 테스트 단계 포함
- [x] 10.10 테스트 환경 격리 (SQLite for E2E, jsdom for unit)
- [x] 10.11 테스트 파일 명명 규칙 준수 (*.test.ts, *.spec.ts)
- [x] 10.12 테스트 커버리지 리포트 생성 가능

---

## Summary

| 관점 | 항목 수 | 통과 | 상태 |
|------|:------:|:----:|:----:|
| 1. Frontend | 12 | 12 | ✅ |
| 2. Backend | 12 | 12 | ✅ |
| 3. Database | 12 | 12 | ✅ |
| 4. API | 12 | 12 | ✅ |
| 5. User Flow | 12 | 12 | ✅ |
| 6. Infrastructure | 12 | 12 | ✅ |
| 7. UI/UX | 12 | 12 | ✅ |
| 8. Mobile | 12 | 12 | ✅ |
| 9. Security | 12 | 12 | ✅ |
| 10. Testing | 12 | 12 | ✅ |
| **Total** | **120** | **120** | **✅ ALL PASS** |
