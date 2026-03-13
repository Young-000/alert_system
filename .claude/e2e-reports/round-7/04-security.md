# Security Review Report - Round 7

## 검사 항목 및 결과

### 1. 하드코딩된 시크릿 검색

#### 발견 사항: Solapi Template IDs (INFO - 위험 없음)
- **파일**: `backend/src/infrastructure/messaging/solapi.service.ts`
- **내용**: Kakao 알림톡 Template ID 상수 (KA01TP 형식) 6개 하드코딩
- **판정**: 양호. Template ID는 공개 식별자로 API Key/Secret 없이는 사용 불가. 실제 API Key/Secret은 ConfigService를 통해 환경변수에서 로드.
- **수정 불필요**

#### 테스트 더미값 (OK)
- mock-jwt-token, password123, SecurePass123! 등은 모두 spec.ts 또는 e2e 테스트 파일에만 존재. 프로덕션 코드 아님.

### 2. .env 파일 gitignore 포함 여부

#### 발견 사항: `frontend/.env.production` 추적됨
- **상태**: git ls-files에 포함됨 (의도적 추적)
- **내용 분석**:
  - `VITE_API_BASE_URL` - CloudFront 공개 URL (비밀 아님)
  - `VITE_VAPID_PUBLIC_KEY` - VAPID 공개키 (설계상 브라우저에 배포되는 공개값)
- **판정**: VITE_ 접두사 환경변수는 Vite 빌드 시 클라이언트 JS에 번들링되어 어차피 공개. VAPID Public Key는 Web Push 스펙상 클라이언트에 공개되는 값.
- **gitignore 패턴**: `.env`, `.env.local`, `.env.*.local`은 제외. `.env.production`은 의도적으로 추적. 수정 불필요.
- **진짜 시크릿** (VAPID Private Key, Solapi API Secret, JWT Secret 등)은 AWS SSM Parameter Store에 저장.

### 3. SQL Injection 취약점

- **검사 대상**: `backend/src` 전체
- **발견**: `sample-data.seed.ts`에서 `queryRunner.query()` raw SQL 사용
- **판정**: 양호. 모든 raw query가 parameterized query (`$1`, `$2` 등) 사용. 사용자 입력이 직접 SQL 문자열에 보간되는 케이스 없음.
- **수정 불필요**

### 4. XSS 취약점

- **검사 결과**: `frontend/src/**/*.tsx` 전체에서 innerHTML 직접 조작 없음
- **판정**: 양호
- **수정 불필요**

### 5. 입력 검증 (DTO validation)

#### 백엔드 DTOs
- class-validator 데코레이터 (IsString, IsNotEmpty, IsOptional, ArrayMinSize 등) 적용
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` 전역 적용 - 미정의 필드 자동 제거/거부
- **판정**: 양호

#### 프론트엔드 parseInt 검증
- `alert-settings/cron-utils.ts`: 모든 `parseInt` 후 `isNaN()` 체크 수행 - 양호
- `settings/SmartDepartureTab.tsx:219`: `parseInt(e.target.value) || 15` - 기본값 처리 양호
- **판정**: 양호

### 6. CORS 설정

- **파일**: `backend/src/main.ts`
- **설정**: 명시적 도메인 화이트리스트 방식
  - `http://localhost:5173-5178` (개발)
  - `https://frontend-xi-two-52.vercel.app` (프로덕션)
  - `https://alert-commute-test.vercel.app`
  - Vercel 프리뷰 URL 패턴 정규식 검증
  - `process.env.CORS_ORIGIN` 추가 origin 지원
- **판정**: 양호. 와일드카드(`*`) 없음. 명시적 패턴 검증 사용.

### 7. 인증/인가 미적용 라우트

#### 전역 JwtAuthGuard 적용
- `APP_GUARD`로 `JwtAuthGuard` 전역 등록 - 모든 라우트에 인증 필수
- `@Public()` 데코레이터로 예외 명시

#### @Public() 라우트 목록 (의도적 공개)
| 라우트 | 이유 | 판정 |
|--------|------|------|
| GET /health | ALB 헬스체크 | OK |
| POST/DELETE/GET /dev/seed | 개발환경 전용 (production에서 모듈 제외 + 코드 내부 환경 체크) | OK |
| POST /auth/* | 인증 엔드포인트 | OK |
| GET /bus/*, GET /subway/*, GET /weather/* | 대중교통/날씨 공개 데이터 | OK |
| POST /scheduler/trigger, POST /scheduler/weekly-report | JWT 대신 자체 시크릿 검증 (timingSafeEqual) | OK |
| GET /insights/regions/* | 집계 통계 (개인정보 없음) | OK |

- **판정**: 모든 @Public() 라우트가 적절한 이유를 갖추거나 자체 인증 방어 있음

### 8. 보안 헤더 (Helmet)

- `helmet()` 적용: CSP, X-Frame-Options 등 설정
- `contentSecurityPolicy`: defaultSrc `'self'`
- **판정**: 양호

### 9. Rate Limiting

- `ThrottlerGuard` 전역 적용: 60초당 60 요청 제한
- **판정**: 양호

### 10. 에러 스택 트레이스 노출

- `AllExceptionsFilter`: 500 에러 시 스택을 서버 로그(logger)에만 기록, 응답에는 노출 안 함
- 클라이언트 응답: `{ statusCode, message, path }` 형태로 제한
- **판정**: 양호

## 종합 결과

| 항목 | 상태 | 수정 건수 |
|------|------|----------|
| 하드코딩 시크릿 | OK (Template IDs는 공개 식별자) | 0 |
| .env gitignore | OK (.env.production 내용이 공개값만 포함) | 0 |
| SQL Injection | OK (parameterized query) | 0 |
| XSS | OK (innerHTML 직접 조작 없음) | 0 |
| 입력 검증 | OK | 0 |
| CORS | OK (명시적 화이트리스트) | 0 |
| 인증/인가 | OK (전역 JWT + @Public 적절 사용) | 0 |
| 보안 헤더 | OK (Helmet) | 0 |
| Rate Limiting | OK (60req/min) | 0 |
| 에러 노출 | OK | 0 |

**총 수정: 0건**
**보안 상태: PASS - 심각한 취약점 없음**
