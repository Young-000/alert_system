import { ValidationPipe } from '@nestjs/common';
import { UpdateRouteDto } from './commute.dto';
import { CheckpointType } from '@domain/entities/commute-route.entity';

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
