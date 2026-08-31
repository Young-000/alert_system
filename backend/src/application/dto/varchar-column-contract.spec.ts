import { ValidationPipe } from '@nestjs/common';
import { CreateAlertDto } from './create-alert.dto';
import { UpdateAlertDto } from './update-alert.dto';
import { AlertType } from '@domain/entities/alert.entity';

/**
 * 회귀 방지: `alerts`의 varchar(100) 두 컬럼으로 흘러가는 DTO 필드에 폭 상한이 없다.
 *
 * 앞선 라운드들은 `@MaxLength`가 **걸려 있는** 필드의 숫자만 컬럼 폭과 대조했다.
 * 그래서 "상한이 아예 없는 필드"는 스윕에 잡히지 않았다. 이번에는 **엔티티↔DDL**에서
 * 출발해 폭이 어긋난 컬럼을 먼저 찾고, 거기로 들어오는 DTO 필드를 역추적했다.
 *
 * | 컬럼 (DDL) | 엔티티 선언 | DTO 상한 |
 * |---|---|---|
 * | `alerts.schedule VARCHAR(100)` (`schema.sql:33`) | `@Column()` = 암묵 255 | 없음 |
 * | `alerts.bus_stop_id VARCHAR(100)` (`schema.sql:36`) | `@Column({ nullable: true })` = 암묵 255 | 없음 |
 *
 * 엔티티가 길이를 생략해 TypeORM 기본값 255로 잡히는 것이 이 결함을 가렸다.
 * 테스트는 `synchronize: true`로 스키마를 엔티티에서 만들기 때문에 **255짜리 컬럼**을
 * 얻는다 — 실제 DDL의 100을 볼 방법이 없다. 기존 1729건이 전부 통과한 이유다.
 *
 * `schedule`은 cron 검증만 통과하면 되는데, cron 문법상 100자를 넘는 **유효한** 식이 있다:
 * 분 필드에 0~59를 모두 나열하면 177자다(`cron-parser` 파싱 성공). 즉 정상 사용자도
 * 닿을 수 있는 값이며, Postgres가 `value too long for type character varying(100)`으로
 * 끊어 400이 아니라 **500**이 된다.
 */

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

/** 분 0~59를 모두 나열한 유효한 cron 식 — 177자. */
const LONG_VALID_CRON = `${Array.from({ length: 60 }, (_, i) => i).join(',')} * * * *`;
/** 컬럼 폭과 같은 길이의 cron 식 — 저장 가능하므로 통과해야 한다. */
const CRON_AT_LIMIT = `${Array.from({ length: 33 }, (_, i) => i).join(',')} * * * *`;

const BUS_STOP_AT_LIMIT = 'A'.repeat(100);
const BUS_STOP_OVER_LIMIT = 'A'.repeat(101);

const baseCreate = {
  userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f',
  name: '출근 알림',
  schedule: '0 8 * * 1-5',
  alertTypes: [AlertType.WEATHER],
};

describe('varchar(100) 컬럼 계약 - schedule', () => {
  const metadata = { type: 'body' as const, metatype: CreateAlertDto };

  it('100자를 넘는 cron 식은 400으로 거절한다 (컬럼은 varchar(100))', async () => {
    expect(LONG_VALID_CRON.length).toBeGreaterThan(100);
    await expect(
      pipe.transform({ ...baseCreate, schedule: LONG_VALID_CRON }, metadata),
    ).rejects.toThrow();
  });

  it('[대조군] 100자 이내의 cron 식은 통과한다', async () => {
    expect(CRON_AT_LIMIT.length).toBeLessThanOrEqual(100);
    await expect(
      pipe.transform({ ...baseCreate, schedule: CRON_AT_LIMIT }, metadata),
    ).resolves.toBeDefined();
  });

  it('[대조군] 평범한 cron 식은 통과한다', async () => {
    await expect(
      pipe.transform({ ...baseCreate, schedule: '0 8 * * 1-5' }, metadata),
    ).resolves.toBeDefined();
  });

  it('[대조군] 폭은 맞아도 cron으로 무효한 값은 여전히 거절한다', async () => {
    await expect(
      pipe.transform({ ...baseCreate, schedule: 'not-a-cron' }, metadata),
    ).rejects.toThrow();
  });
});

describe('varchar(100) 컬럼 계약 - busStopId', () => {
  const metadata = { type: 'body' as const, metatype: CreateAlertDto };

  it('100자를 넘는 busStopId는 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...baseCreate, busStopId: BUS_STOP_OVER_LIMIT }, metadata),
    ).rejects.toThrow();
  });

  it('[대조군] 경계값(100자)은 통과한다 — 저장 가능한 값을 막지 않는다', async () => {
    await expect(
      pipe.transform({ ...baseCreate, busStopId: BUS_STOP_AT_LIMIT }, metadata),
    ).resolves.toBeDefined();
  });

  it('[대조군] 실제 공공 API 정류장 ID는 통과한다', async () => {
    await expect(
      pipe.transform({ ...baseCreate, busStopId: 'ICB165000524' }, metadata),
    ).resolves.toBeDefined();
  });

  it('[대조군] busStopId는 선택 필드라 없어도 통과한다', async () => {
    await expect(pipe.transform({ ...baseCreate }, metadata)).resolves.toBeDefined();
  });
});

describe('varchar(100) 컬럼 계약 - UpdateAlertDto', () => {
  const metadata = { type: 'body' as const, metatype: UpdateAlertDto };

  it('수정 경로에서도 100자 초과 cron 식을 거절한다', async () => {
    await expect(
      pipe.transform({ schedule: LONG_VALID_CRON }, metadata),
    ).rejects.toThrow();
  });

  it('수정 경로에서도 100자 초과 busStopId를 거절한다', async () => {
    await expect(
      pipe.transform({ busStopId: BUS_STOP_OVER_LIMIT }, metadata),
    ).rejects.toThrow();
  });

  it('[대조군] 수정 경로의 경계값은 통과한다', async () => {
    await expect(
      pipe.transform(
        { schedule: CRON_AT_LIMIT, busStopId: BUS_STOP_AT_LIMIT },
        metadata,
      ),
    ).resolves.toBeDefined();
  });

  it('[대조군] 빈 수정 요청은 통과한다', async () => {
    await expect(pipe.transform({}, metadata)).resolves.toBeDefined();
  });
});
