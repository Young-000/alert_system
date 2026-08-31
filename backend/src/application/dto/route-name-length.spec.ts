import { ValidationPipe } from '@nestjs/common';
import { CreateRouteDto, UpdateRouteDto } from './commute.dto';
import { CheckpointType, RouteType } from '@domain/entities/commute-route.entity';

/**
 * 회귀 방지: 경로/체크포인트의 문자열 컬럼에는 폭이 있는데 DTO는 상한을 재지 않았다.
 *
 * `20260208_add_commute_tracking_tables.sql`:
 *   commute_routes.name            VARCHAR(100)
 *   route_checkpoints.name         VARCHAR(100)
 *   route_checkpoints.linked_bus_stop_id VARCHAR(100)
 *   route_checkpoints.line_info    VARCHAR(50)
 *
 * TypeORM 쪽도 같다 (`commute-route.entity.ts:28` `@Column({ length: 100 })`).
 * 그런데 `CreateRouteDto.name`·`UpdateRouteDto.name`·`CreateCheckpointDto.name`은
 * `@IsString()`+`@IsNotEmpty()`만 걸려 **상한이 아예 없었다**. 도메인 계층
 * (`CommuteRoute`)에도 길이 검사가 없고 `manage-route.use-case.ts:33,133`이
 * `dto.name`을 그대로 엔티티에 넘긴다.
 *
 * 그래서 101자 이름은 검증을 통과해 INSERT/UPDATE 까지 내려가고, Postgres가
 * `value too long for type character varying(100)`으로 끊는다 — 400이 아니라 **500**이다.
 * `alert-name-length.spec.ts`가 막은 것과 같은 결함이 경로 쪽에 남아 있었다.
 *
 * 상한은 DB 계약과 같은 값으로 맞춘다.
 */
describe('경로/체크포인트 문자열 길이 검증 (DB varchar 계약)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const NAME_MAX = 100;
  const LINE_INFO_MAX = 50;
  const nameAtLimit = 'a'.repeat(NAME_MAX);
  const nameOverLimit = 'a'.repeat(NAME_MAX + 1);

  const validCheckpoint = {
    sequenceOrder: 0,
    name: '집',
    checkpointType: CheckpointType.HOME,
  };

  describe('CreateRouteDto.name — commute_routes.name VARCHAR(100)', () => {
    const metadata = { type: 'body' as const, metatype: CreateRouteDto };
    const base = {
      userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f',
      routeType: RouteType.MORNING,
      checkpoints: [validCheckpoint],
    };

    it('100자 경로 이름은 통과한다 (대조군)', async () => {
      const result = (await pipe.transform(
        { ...base, name: nameAtLimit },
        metadata,
      )) as CreateRouteDto;

      expect(result.name).toBe(nameAtLimit);
    });

    it('101자 경로 이름은 400으로 거절한다 (DB까지 내려가 500이 되지 않도록)', async () => {
      await expect(
        pipe.transform({ ...base, name: nameOverLimit }, metadata),
      ).rejects.toThrow();
    });
  });

  describe('UpdateRouteDto.name — 같은 컬럼, 같은 상한', () => {
    const metadata = { type: 'body' as const, metatype: UpdateRouteDto };

    it('100자 경로 이름은 통과한다 (대조군)', async () => {
      const result = (await pipe.transform(
        { name: nameAtLimit },
        metadata,
      )) as UpdateRouteDto;

      expect(result.name).toBe(nameAtLimit);
    });

    it('101자 경로 이름은 400으로 거절한다', async () => {
      await expect(
        pipe.transform({ name: nameOverLimit }, metadata),
      ).rejects.toThrow();
    });
  });

  describe('CreateCheckpointDto — route_checkpoints 컬럼 폭', () => {
    const metadata = { type: 'body' as const, metatype: CreateRouteDto };
    const base = {
      userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f',
      name: '출근길',
      routeType: RouteType.MORNING,
    };

    it('101자 체크포인트 이름은 400으로 거절한다 (name VARCHAR(100))', async () => {
      await expect(
        pipe.transform(
          { ...base, checkpoints: [{ ...validCheckpoint, name: nameOverLimit }] },
          metadata,
        ),
      ).rejects.toThrow();
    });

    it('101자 linkedBusStopId는 400으로 거절한다 (linked_bus_stop_id VARCHAR(100))', async () => {
      await expect(
        pipe.transform(
          {
            ...base,
            checkpoints: [{ ...validCheckpoint, linkedBusStopId: nameOverLimit }],
          },
          metadata,
        ),
      ).rejects.toThrow();
    });

    it('51자 lineInfo는 400으로 거절한다 (line_info VARCHAR(50))', async () => {
      await expect(
        pipe.transform(
          {
            ...base,
            checkpoints: [
              { ...validCheckpoint, lineInfo: 'a'.repeat(LINE_INFO_MAX + 1) },
            ],
          },
          metadata,
        ),
      ).rejects.toThrow();
    });

    it('상한 이내의 체크포인트는 통과한다 (대조군)', async () => {
      const result = (await pipe.transform(
        {
          ...base,
          checkpoints: [
            {
              ...validCheckpoint,
              name: nameAtLimit,
              linkedBusStopId: 'a'.repeat(NAME_MAX),
              lineInfo: 'a'.repeat(LINE_INFO_MAX),
            },
          ],
        },
        metadata,
      )) as CreateRouteDto;

      expect(result.checkpoints[0].name).toBe(nameAtLimit);
      expect(result.checkpoints[0].lineInfo).toBe('a'.repeat(LINE_INFO_MAX));
    });
  });
});
