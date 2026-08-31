import { ValidationPipe } from '@nestjs/common';
import { DepartureConfirmedDto } from './behavior.dto';
import { CreateRouteDto, RecordCheckpointDto } from './commute.dto';
import { CreateAlternativeMappingDto } from './delay-status.dto';
import { CheckpointType, RouteType } from '@domain/entities/commute-route.entity';

/**
 * 회귀 방지: 정수 컬럼으로 흘러가는 DTO 필드의 계약.
 *
 * 두 갈래다.
 *
 * **(a) 타입 미검증** — `DepartureConfirmedDto.transitDelayMinutes`는 `@IsOptional()`만
 * 걸려 있어 `'abc'` 같은 문자열도 통과했다. `track-behavior.use-case.ts:82`가 그 값을
 * `CommuteRecord.createFromDepartureConfirmation`에 넘기고 도메인에도 검사가 없어
 * (`commute-record.entity.ts:56-73`) `commute_records.transit_delay_minutes INTEGER`
 * (`20260120_add_behavior_tracking.sql:45`)까지 내려간다 →
 * `invalid input syntax for type integer`, **500**.
 *
 * **(b) 범위 미검증** — `@Min(0)`은 있으나 상한이 없는 필드들은 `2147483648`을 통과시킨다.
 * Postgres `INTEGER`는 int4라 `integer out of range`로 끊는다 → 역시 **500**.
 *
 * 상한은 도메인 감각이 아니라 **컬럼 한계와 같은 값**을 쓴다. 더 좁게 잡으면 저장 가능한
 * 값을 되레 400으로 막게 된다 (직전 라운드 `@IsUUID` 버전 미고정과 같은 판단).
 */

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const INT4_MAX = 2147483647;
const OVER_INT4 = 2147483648;
const UUID = 'b7c9d1e2-3456-4789-abcd-ef0123456789';

describe('정수 컬럼 계약 (a) - DepartureConfirmedDto.transitDelayMinutes 타입', () => {
  const metadata = { type: 'body' as const, metatype: DepartureConfirmedDto };
  const base = { userId: UUID, alertId: UUID, source: 'push' as const };

  it('숫자가 아닌 transitDelayMinutes는 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, transitDelayMinutes: 'abc' }, metadata),
    ).rejects.toThrow();
  });

  it('int4를 넘는 transitDelayMinutes는 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, transitDelayMinutes: OVER_INT4 }, metadata),
    ).rejects.toThrow();
  });

  it('정수 지연은 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { ...base, transitDelayMinutes: 15 },
      metadata,
    )) as DepartureConfirmedDto;
    expect(result.transitDelayMinutes).toBe(15);
  });

  it('음수 지연은 통과한다 (대조군 - 예정보다 빠른 도착을 막지 않는다)', async () => {
    const result = (await pipe.transform(
      { ...base, transitDelayMinutes: -3 },
      metadata,
    )) as DepartureConfirmedDto;
    expect(result.transitDelayMinutes).toBe(-3);
  });

  it('생략은 통과한다 (대조군 - optional 보존)', async () => {
    const result = (await pipe.transform({ ...base }, metadata)) as DepartureConfirmedDto;
    expect(result.transitDelayMinutes).toBeUndefined();
  });
});

describe('정수 컬럼 계약 (b) - route_checkpoints 정수 필드 상한', () => {
  const metadata = { type: 'body' as const, metatype: CreateRouteDto };
  const base = { userId: UUID, name: '출근길', routeType: RouteType.MORNING };
  const cp = { sequenceOrder: 0, name: '집', checkpointType: CheckpointType.HOME };

  it.each([
    ['sequenceOrder', { ...cp, sequenceOrder: OVER_INT4 }],
    ['expectedDurationToNext', { ...cp, expectedDurationToNext: OVER_INT4 }],
    ['expectedWaitTime', { ...cp, expectedWaitTime: OVER_INT4 }],
  ])('int4를 넘는 %s는 400으로 거절한다', async (_field, checkpoint) => {
    await expect(
      pipe.transform({ ...base, checkpoints: [checkpoint] }, metadata),
    ).rejects.toThrow();
  });

  it('int4 상한값 자체는 통과한다 (대조군 - 경계를 반대로 잡지 않았는지)', async () => {
    const result = (await pipe.transform(
      { ...base, checkpoints: [{ ...cp, expectedWaitTime: INT4_MAX }] },
      metadata,
    )) as CreateRouteDto;
    expect(result.checkpoints[0].expectedWaitTime).toBe(INT4_MAX);
  });

  it('정상 범위 값은 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { ...base, checkpoints: [{ ...cp, sequenceOrder: 1, expectedDurationToNext: 10 }] },
      metadata,
    )) as CreateRouteDto;
    expect(result.checkpoints[0].expectedDurationToNext).toBe(10);
  });
});

describe('정수 컬럼 계약 (b) - checkpoint_records.actual_wait_time 상한', () => {
  const metadata = { type: 'body' as const, metatype: RecordCheckpointDto };

  it('int4를 넘는 actualWaitTime은 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ sessionId: UUID, checkpointId: UUID, actualWaitTime: OVER_INT4 }, metadata),
    ).rejects.toThrow();
  });

  it('정상 대기 시간은 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { sessionId: UUID, checkpointId: UUID, actualWaitTime: 3 },
      metadata,
    )) as RecordCheckpointDto;
    expect(result.actualWaitTime).toBe(3);
  });
});

describe('정수 컬럼 계약 (b) - alternative_mappings.walking_distance_meters 상한', () => {
  const metadata = { type: 'body' as const, metatype: CreateAlternativeMappingDto };
  const base = {
    fromStationName: '강남',
    fromLine: '2호선',
    toStationName: '역삼',
    toLine: '2호선',
    walkingMinutes: 5,
  };

  it('int4를 넘는 walkingDistanceMeters는 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, walkingDistanceMeters: OVER_INT4 }, metadata),
    ).rejects.toThrow();
  });

  it('정상 거리는 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { ...base, walkingDistanceMeters: 400 },
      metadata,
    )) as CreateAlternativeMappingDto;
    expect(result.walkingDistanceMeters).toBe(400);
  });
});
