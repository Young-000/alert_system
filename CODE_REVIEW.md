# 코드 리뷰 보고서

## 📋 개요
- **프로젝트**: Alert System (출근/퇴근 알림 시스템)
- **아키텍처**: Clean Architecture + NestJS
- **리뷰 일자**: 2024

---

## ✅ 잘된 점 (Strengths)

### 1. 아키텍처 설계
- ✅ **Clean Architecture 원칙 준수**: Domain, Application, Infrastructure, Presentation 레이어가 명확히 분리됨
- ✅ **의존성 역전 원칙**: Repository 인터페이스를 통한 추상화가 잘 되어 있음
- ✅ **단일 책임 원칙**: 각 클래스가 명확한 책임을 가짐

### 2. 코드 구조
- ✅ **모듈화**: 기능별로 모듈이 잘 분리되어 있음
- ✅ **타입 안정성**: TypeScript를 적절히 활용
- ✅ **테스트 작성**: TDD 방식으로 테스트가 작성되어 있음

### 3. 기술 스택
- ✅ **현대적인 기술**: NestJS, TypeORM, BullMQ 등 적절한 선택
- ✅ **PWA 지원**: 프론트엔드에 PWA 기능 포함

---

## ⚠️ 개선이 필요한 점 (Issues)

### 🔴 Critical (즉시 수정 권장)

#### 1. 에러 처리 (Error Handling)
**문제점:**
- 일반 `Error` 객체를 던지고 있음
- NestJS의 HTTP 예외를 사용하지 않음
- 클라이언트에게 적절한 HTTP 상태 코드가 전달되지 않음

**위치:**
- `backend/src/application/use-cases/create-user.use-case.ts:12`
- `backend/src/application/use-cases/create-alert.use-case.ts:16`
- `backend/src/infrastructure/external-apis/weather-api.client.ts:35`

**개선 방안:**
```typescript
// Before
throw new Error('User already exists');

// After
import { ConflictException, NotFoundException } from '@nestjs/common';
throw new ConflictException('User already exists');
throw new NotFoundException('User not found');
```

#### 2. DTO 검증 (Validation)
**문제점:**
- `class-validator`가 설치되어 있지만 사용하지 않음
- 입력 데이터 검증이 없어 잘못된 데이터가 들어올 수 있음

**위치:**
- `backend/src/application/dto/create-user.dto.ts`
- `backend/src/application/dto/create-alert.dto.ts`

**개선 방안:**
```typescript
import { IsEmail, IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
```

그리고 `main.ts`에 전역 ValidationPipe 추가:
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

#### 3. CORS 설정
**문제점:**
- `app.enableCors()`로 모든 origin 허용
- 프로덕션 환경에서 보안 위험

**위치:**
- `backend/src/main.ts:6`

**개선 방안:**
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

---

### 🟡 Important (중요하지만 급하지 않음)

#### 4. 타입 안정성
**문제점:**
- `(user as any).id = entity.id;` 같은 타입 우회 사용
- Domain Entity의 readonly 속성을 우회하는 방식

**위치:**
- `backend/src/infrastructure/persistence/postgres-user.repository.ts:39`
- `backend/src/infrastructure/persistence/postgres-alert.repository.ts:54`

**개선 방안:**
```typescript
// Domain Entity에 private setter 추가 또는
// Factory 메서드 사용
private toDomain(entity: UserEntity): User {
  const user = new User(entity.email, entity.name, entity.location);
  // Reflection을 사용하거나
  Object.defineProperty(user, 'id', { value: entity.id, writable: false });
  return user;
}
```

#### 5. 로깅
**문제점:**
- `console.log` 사용
- 프로덕션 환경에서 로그 레벨 관리 불가

**위치:**
- `backend/src/main.ts:9`

**개선 방안:**
```typescript
import { Logger } from '@nestjs/common';
const logger = new Logger('Bootstrap');
logger.log(`Application is running on: http://localhost:${port}`);
```

#### 6. 환경 변수 검증
**문제점:**
- 필수 환경 변수 검증 없음
- 런타임 에러 가능성

**개선 방안:**
```typescript
// config/config.validation.ts
import { IsString, IsOptional } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  PORT?: string;
}

// main.ts에서 검증
import { validate } from 'class-validator';
const config = plainToClass(EnvironmentVariables, process.env);
const errors = await validate(config);
if (errors.length > 0) {
  throw new Error('Invalid environment variables');
}
```

#### 7. 에러 메시지 노출
**문제점:**
- 외부 API 에러 메시지가 그대로 노출됨
- 보안 및 사용자 경험 문제

**위치:**
- `backend/src/infrastructure/external-apis/weather-api.client.ts:35`

**개선 방안:**
```typescript
catch (error) {
  logger.error('Failed to fetch weather', error);
  throw new InternalServerErrorException('Failed to fetch weather data');
}
```

---

### 🟢 Minor (선택적 개선)

#### 8. 컨트롤러에서 Repository 직접 사용
**문제점:**
- 컨트롤러에서 Repository를 직접 주입받아 사용
- Use Case를 통하지 않고 Domain 레이어에 직접 접근

**위치:**
- `backend/src/presentation/controllers/user.controller.ts:20`
- `backend/src/presentation/controllers/alert.controller.ts:20, 25, 30`

**개선 방안:**
- 모든 비즈니스 로직을 Use Case로 이동
- 컨트롤러는 Use Case만 호출하도록 변경

#### 9. 스케줄 패턴 검증
**문제점:**
- `alert.schedule`이 cron 패턴인지 검증 없음
- 잘못된 패턴으로 인한 런타임 에러 가능

**개선 방안:**
```typescript
import { IsString, Matches } from 'class-validator';

export class CreateAlertDto {
  @Matches(/^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[01])|\*\/([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/)
  schedule: string;
}
```

#### 10. 테스트 커버리지
**문제점:**
- 일부 파일에 테스트가 없을 수 있음
- E2E 테스트 부족

**개선 방안:**
- 테스트 커버리지 리포트 확인
- 누락된 테스트 추가

---

## 📝 구체적인 수정 제안

### ✅ 우선순위 1: 에러 처리 및 DTO 검증 (완료)
1. ✅ NestJS 예외 클래스 사용 (`ConflictException`, `NotFoundException`)
2. ✅ DTO에 class-validator 데코레이터 추가
3. ✅ 전역 ValidationPipe 설정

### ✅ 우선순위 2: 보안 강화 (부분 완료)
1. ✅ CORS 설정 제한 (환경 변수로 제어 가능)
2. ⏳ 환경 변수 검증 (추가 작업 필요)
3. ✅ 에러 메시지 필터링 (로깅 추가)

### ⏳ 우선순위 3: 코드 품질 (부분 완료)
1. ✅ 로깅 시스템 도입 (`Logger` 사용)
2. ⏳ 타입 안정성 개선 (추가 작업 필요)
3. ⏳ 컨트롤러 리팩토링 (추가 작업 필요)

---

## 🔧 적용된 개선사항

### 1. main.ts
- ✅ 전역 ValidationPipe 추가
- ✅ CORS 설정 개선 (환경 변수 지원)
- ✅ Logger 사용으로 변경

### 2. DTO 검증
- ✅ `CreateUserDto`: 이메일, 이름, 위치 검증 추가
- ✅ `CreateAlertDto`: Cron 패턴 검증 추가

### 3. Use Case 에러 처리
- ✅ `CreateUserUseCase`: `ConflictException` 사용
- ✅ `CreateAlertUseCase`: `NotFoundException` 사용

### 4. 외부 API 클라이언트
- ✅ `WeatherApiClient`: Logger 추가 및 에러 메시지 필터링

### 5. 테스트 업데이트
- ✅ 예외 타입 변경에 따른 테스트 수정

---

## 🎯 종합 평가

### 점수: 7.5/10

**강점:**
- 아키텍처 설계가 우수함
- 코드 구조가 깔끔하고 모듈화가 잘 되어 있음
- 테스트 작성이 되어 있음

**개선 필요:**
- 에러 처리 및 검증 로직 보강 필요
- 보안 설정 강화 필요
- 프로덕션 준비도 향상 필요

---

## 📚 참고 자료

- [NestJS Exception Handling](https://docs.nestjs.com/exception-filters)
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS Logging](https://docs.nestjs.com/techniques/logger)
