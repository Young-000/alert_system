import { ValidationPipe } from '@nestjs/common';
import { CreateRouteDto, UpdateRouteDto } from './commute.dto';
import { CheckpointType, RouteType } from '@domain/entities/commute-route.entity';

/**
 * 회귀 방지: 전역 파이프는 `forbidNonWhitelisted: true`라 DTO에 없는
 * 프로퍼티가 오면 400이다. UpdateRouteDto의 체크포인트가 id를 받지 못하면
 * (1) id를 실은 수정 요청이 전부 400이 되고
 * (2) id를 빼면 CASCADE로 도착 기록이 전량 삭제된다.
 */
describe('UpdateRouteDto - 체크포인트 id 수용', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  const metadata = {
    type: 'body' as const,
    metatype: UpdateRouteDto,
  };

  it('id가 포함된 체크포인트 페이로드를 400 없이 통과시킨다', async () => {
    const result = (await pipe.transform(
      {
        name: '이름만 변경',
        checkpoints: [
          {
            id: 'a3f1c2d4-5678-4abc-9def-0123456789ab',
            sequenceOrder: 0,
            name: '집',
            checkpointType: CheckpointType.HOME,
          },
        ],
      },
      metadata,
    )) as UpdateRouteDto;

    expect(result.checkpoints?.[0].id).toBe('a3f1c2d4-5678-4abc-9def-0123456789ab');
  });

  it('uuid가 아닌 id는 거부한다', async () => {
    await expect(
      pipe.transform(
        {
          checkpoints: [
            { id: 'not-a-uuid', sequenceOrder: 0, name: '집', checkpointType: CheckpointType.HOME },
          ],
        },
        metadata,
      ),
    ).rejects.toThrow();
  });

  it('빈 checkpoints 배열은 거부한다 — 전체 삭제 경로 차단', async () => {
    await expect(pipe.transform({ checkpoints: [] }, metadata)).rejects.toThrow();
  });
});

/**
 * 회귀 방지: `route_checkpoints.linked_station_id`는 **uuid** 컬럼인데
 * (`route-checkpoint.entity.ts:54` `@Column({ type: 'uuid' })`,
 *  `20260208_add_commute_tracking_tables.sql` `linked_station_id UUID REFERENCES ...`)
 * `CreateCheckpointDto.linkedStationId`는 `@IsString()`만 걸려 있었다.
 *
 * `manage-route.use-case.ts:135`가 그 값을 그대로 엔티티에 넘기므로 '강남역' 같은
 * 문자열이 INSERT까지 내려가고 Postgres가 `invalid input syntax for type uuid`로
 * 끊는다 — 400이 아니라 **500**이다. 같은 파일의 `userId`·체크포인트 `id`는
 * 이미 `@IsUUID`를 쓰고 있어 컨벤션은 이미 있었다.
 *
 * 버전을 고정하지 않은 `@IsUUID()`를 쓴다 — 컬럼 타입이 요구하는 것은 "uuid"이지
 * "v4"가 아니라서, 버전을 박으면 저장 가능한 값을 되레 막을 수 있다.
 */
describe('CreateCheckpointDto.linkedStationId - uuid 컬럼 계약', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const metadata = { type: 'body' as const, metatype: CreateRouteDto };
  const base = {
    userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f',
    name: '출근길',
    routeType: RouteType.MORNING,
  };
  const checkpoint = {
    sequenceOrder: 0,
    name: '강남역',
    checkpointType: CheckpointType.SUBWAY,
  };

  it('uuid가 아닌 linkedStationId는 400으로 거절한다 (DB까지 내려가 500이 되지 않도록)', async () => {
    await expect(
      pipe.transform(
        { ...base, checkpoints: [{ ...checkpoint, linkedStationId: '강남역' }] },
        metadata,
      ),
    ).rejects.toThrow();
  });

  it('uuid 형식의 linkedStationId는 통과한다 (대조군)', async () => {
    const stationId = 'b7c9d1e2-3456-4789-abcd-ef0123456789';
    const result = (await pipe.transform(
      { ...base, checkpoints: [{ ...checkpoint, linkedStationId: stationId }] },
      metadata,
    )) as CreateRouteDto;

    expect(result.checkpoints[0].linkedStationId).toBe(stationId);
  });
});
