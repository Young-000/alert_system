import { ValidationPipe } from '@nestjs/common';
import { DepartureConfirmedDto } from './behavior.dto';
import { StartSessionDto, RecordCheckpointDto } from './commute.dto';
import { CreateAlternativeMappingDto } from './delay-status.dto';
import { RegisterLiveActivityDto } from './live-activity.dto';

/**
 * 회귀 방지: varchar 컬럼으로 흘러가는 DTO 문자열 필드에 폭 상한이 **아예 없다**.
 *
 * 직전 라운드는 **엔티티↔DDL**에서 출발해 폭이 어긋난 컬럼(`alerts.schedule`·
 * `alerts.bus_stop_id`)을 찾았다. 그 스윕은 엔티티가 DDL보다 넓게 선언된 경우만 본다 —
 * **엔티티가 DDL과 이미 일치하면 아무것도 나오지 않는다.** 그래도 DTO에 상한이 없으면
 * 초과 길이가 그대로 INSERT까지 내려간다.
 *
 * 이번 스윕은 세 번째 축이다: **DTO의 무상한 string 필드**에서 출발해 그 값이 도달하는
 * varchar 컬럼을 역추적했다. 아래 5개 DTO 8필드가 걸렸다.
 *
 * | 컬럼 (DDL) | 엔티티 | DTO 상한 | 도달 경로 |
 * |---|---|---|---|
 * | `commute_records.weather_condition VARCHAR(50)` | `length: 50` (일치) | 없음 | `behavior.controller:98` → `track-behavior.use-case:85` |
 * | `commute_sessions.weather_condition VARCHAR(50)` | 일치 | 없음 | `commute.controller:64` → `manage-commute-session.use-case:69` |
 * | `checkpoint_records.notes VARCHAR(255)` | 일치 | 없음 | `commute.controller:81` → `manage-commute-session.use-case:125` |
 * | `alternative_mappings.from_station_name VARCHAR(100)` | 일치 | 없음 | `delay-status.controller:101` |
 * | `alternative_mappings.from_line VARCHAR(50)` | 일치 | 없음 | 〃 |
 * | `alternative_mappings.to_station_name VARCHAR(100)` | 일치 | 없음 | 〃 |
 * | `alternative_mappings.to_line VARCHAR(50)` | 일치 | 없음 | 〃 |
 * | `live_activity_tokens.activity_id VARCHAR(255)` | `length: 255` (일치) | 없음 | `live-activity.controller:44` |
 *
 * **테스트가 구조적으로 못 보는 결함이다.** 테스트는 `synchronize: true`로 엔티티에서
 * 스키마를 만들고 SQLite는 varchar 폭을 강제하지 않는다. 실제 Postgres 는
 * `value too long for type character varying(n)`으로 끊어 400이 아니라 **500**이 된다.
 *
 * 상한은 컬럼 폭과 **같은 값**으로 둔다. 도메인 감각으로 좁히면 저장 가능한 값을
 * 400으로 되돌리게 된다 (`column-limits.ts`의 원칙과 동일).
 */

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const UUID_A = '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f';
const UUID_B = '7a8b9c0d-1e2f-4a3b-8c5d-6e7f8a9b0c1d';

describe('varchar(50) 계약 - commute_records.weather_condition', () => {
  const metadata = { type: 'body' as const, metatype: DepartureConfirmedDto };
  const base = { userId: UUID_A, alertId: UUID_B, source: 'app' as const };

  it('50자를 넘는 weatherCondition은 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, weatherCondition: '맑'.repeat(51) }, metadata),
    ).rejects.toThrow();
  });

  it('[대조군] 정확히 50자는 통과한다 (저장 가능한 값)', async () => {
    await expect(
      pipe.transform({ ...base, weatherCondition: '맑'.repeat(50) }, metadata),
    ).resolves.toBeDefined();
  });

  it('[대조군] 실제 날씨 문자열은 통과한다', async () => {
    await expect(
      pipe.transform({ ...base, weatherCondition: '흐리고 비' }, metadata),
    ).resolves.toBeDefined();
  });

  it('[대조군] weatherCondition 생략은 통과한다 (선택 필드)', async () => {
    await expect(pipe.transform({ ...base }, metadata)).resolves.toBeDefined();
  });
});

describe('varchar(50) 계약 - commute_sessions.weather_condition', () => {
  const metadata = { type: 'body' as const, metatype: StartSessionDto };
  const base = { userId: UUID_A, routeId: UUID_B };

  it('50자를 넘는 weatherCondition은 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, weatherCondition: 'A'.repeat(51) }, metadata),
    ).rejects.toThrow();
  });

  it('[대조군] 정확히 50자는 통과한다', async () => {
    await expect(
      pipe.transform({ ...base, weatherCondition: 'A'.repeat(50) }, metadata),
    ).resolves.toBeDefined();
  });
});

describe('varchar(255) 계약 - checkpoint_records.notes', () => {
  const metadata = { type: 'body' as const, metatype: RecordCheckpointDto };
  const base = { sessionId: UUID_A, checkpointId: UUID_B };

  it('255자를 넘는 notes는 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, notes: '가'.repeat(256) }, metadata),
    ).rejects.toThrow();
  });

  it('[대조군] 정확히 255자는 통과한다', async () => {
    await expect(
      pipe.transform({ ...base, notes: '가'.repeat(255) }, metadata),
    ).resolves.toBeDefined();
  });

  it('[대조군] 평범한 메모는 통과한다', async () => {
    await expect(
      pipe.transform({ ...base, notes: '지하철 지연, 환승 복잡' }, metadata),
    ).resolves.toBeDefined();
  });
});

describe('varchar 계약 - alternative_mappings 역/노선명', () => {
  const metadata = { type: 'body' as const, metatype: CreateAlternativeMappingDto };
  const base = {
    fromStationName: '서울역',
    fromLine: '1호선',
    toStationName: '시청',
    toLine: '2호선',
    walkingMinutes: 5,
  };

  it('100자를 넘는 fromStationName은 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, fromStationName: '역'.repeat(101) }, metadata),
    ).rejects.toThrow();
  });

  it('100자를 넘는 toStationName은 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, toStationName: '역'.repeat(101) }, metadata),
    ).rejects.toThrow();
  });

  it('50자를 넘는 fromLine은 400으로 거절한다 (컬럼은 varchar(50))', async () => {
    await expect(
      pipe.transform({ ...base, fromLine: '선'.repeat(51) }, metadata),
    ).rejects.toThrow();
  });

  it('50자를 넘는 toLine은 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, toLine: '선'.repeat(51) }, metadata),
    ).rejects.toThrow();
  });

  it('[대조군] 실제 역명/노선명은 통과한다', async () => {
    await expect(pipe.transform({ ...base }, metadata)).resolves.toBeDefined();
  });

  it('[대조군] 경계값(역명 100자·노선 50자)은 통과한다', async () => {
    await expect(
      pipe.transform(
        {
          ...base,
          fromStationName: '역'.repeat(100),
          toStationName: '역'.repeat(100),
          fromLine: '선'.repeat(50),
          toLine: '선'.repeat(50),
        },
        metadata,
      ),
    ).resolves.toBeDefined();
  });
});

describe('varchar(255) 계약 - live_activity_tokens.activity_id', () => {
  const metadata = { type: 'body' as const, metatype: RegisterLiveActivityDto };
  const base = { pushToken: 'a'.repeat(64), mode: 'commute' as const };

  it('255자를 넘는 activityId는 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, activityId: 'A'.repeat(256) }, metadata),
    ).rejects.toThrow();
  });

  it('[대조군] 정확히 255자는 통과한다', async () => {
    await expect(
      pipe.transform({ ...base, activityId: 'A'.repeat(255) }, metadata),
    ).resolves.toBeDefined();
  });

  it('[대조군] 실제 Live Activity ID(UUID 형태)는 통과한다', async () => {
    await expect(
      pipe.transform({ ...base, activityId: UUID_A }, metadata),
    ).resolves.toBeDefined();
  });
});
