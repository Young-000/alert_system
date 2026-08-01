import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommuteRouteRepositoryImpl } from './commute-route.repository';
import { CommuteRouteEntity } from '../typeorm/commute-route.entity';
import { RouteCheckpointEntity } from '../typeorm/route-checkpoint.entity';
import {
  CommuteRoute,
  RouteCheckpoint,
  RouteType,
  CheckpointType,
} from '@domain/entities/commute-route.entity';

/**
 * 회귀 방지: `checkpoint_records.checkpoint_id`는
 * `route_checkpoints(id) ON DELETE CASCADE`를 건다
 * (`database/migrations/20260208_add_commute_tracking_tables.sql:108`).
 *
 * 따라서 경로 수정 때 체크포인트를 통째로 지웠다가 같은 id로 다시 넣으면
 * 체크포인트는 멀쩡해 보이지만 그 경로의 **도착 기록 전체가 조용히 삭제**된다.
 * 이름만 바꾸는 수정이나 대표 경로 토글에서도 발생한다
 * (`manage-route.use-case.ts:154`는 사용자가 건드리지도 않은 다른 경로를 이 경로로 저장한다).
 */
describe('CommuteRouteRepositoryImpl - update()가 도착 기록을 지우지 않는다', () => {
  let repository: CommuteRouteRepositoryImpl;
  let routeOrm: { save: jest.Mock; findOne: jest.Mock };
  let checkpointOrm: { save: jest.Mock; delete: jest.Mock };

  const makeCheckpoint = (id: string | undefined, order: number, name: string): RouteCheckpoint =>
    new RouteCheckpoint(order, name, CheckpointType.SUBWAY, {
      id,
      routeId: 'route-1',
      expectedDurationToNext: 10,
      expectedWaitTime: 3,
    });

  const makeRoute = (checkpoints: RouteCheckpoint[]): CommuteRoute =>
    new CommuteRoute('user-1', '출근길', RouteType.MORNING, {
      id: 'route-1',
      checkpoints,
      totalExpectedDuration: 30,
    });

  beforeEach(async () => {
    routeOrm = { save: jest.fn().mockResolvedValue({ id: 'route-1' }), findOne: jest.fn() };
    checkpointOrm = { save: jest.fn(), delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommuteRouteRepositoryImpl,
        { provide: getRepositoryToken(CommuteRouteEntity), useValue: routeOrm },
        { provide: getRepositoryToken(RouteCheckpointEntity), useValue: checkpointOrm },
      ],
    }).compile();

    repository = module.get(CommuteRouteRepositoryImpl);
  });

  it('기존 체크포인트를 그대로 유지하는 수정은 아무 체크포인트도 삭제하지 않는다', async () => {
    // 이름만 바꾸는 수정 — 체크포인트는 DB에서 읽어온 것 그대로(id 보유)
    const route = makeRoute([
      makeCheckpoint('cp-1', 0, '집'),
      makeCheckpoint('cp-2', 1, '강남역'),
    ]);

    await repository.update(route);

    // 살아남는 체크포인트를 지우면 그 도착 기록이 CASCADE로 함께 사라진다
    const deletedCriteria = checkpointOrm.delete.mock.calls.map((c) => c[0]);
    for (const criteria of deletedCriteria) {
      expect(criteria).not.toEqual({ routeId: 'route-1' });
    }

    // 체크포인트 자체는 여전히 저장(UPDATE)돼야 한다
    expect(checkpointOrm.save).toHaveBeenCalledTimes(1);
    const savedIds = (checkpointOrm.save.mock.calls[0][0] as RouteCheckpointEntity[]).map((e) => e.id);
    expect(savedIds).toEqual(['cp-1', 'cp-2']);
  });

  it('실제로 제거된 체크포인트만 삭제한다', async () => {
    // cp-2를 빼고 새 체크포인트를 하나 추가한 수정
    const route = makeRoute([
      makeCheckpoint('cp-1', 0, '집'),
      makeCheckpoint(undefined, 1, '신규 정류장'),
    ]);

    await repository.update(route);

    expect(checkpointOrm.delete).toHaveBeenCalledTimes(1);
    const criteria = checkpointOrm.delete.mock.calls[0][0] as {
      routeId: string;
      id?: unknown;
    };
    expect(criteria.routeId).toBe('route-1');
    // 살아남는 id(cp-1)는 삭제 대상에서 제외돼야 한다
    expect(JSON.stringify(criteria.id)).toContain('cp-1');
  });

  it('체크포인트가 모두 없어지면 해당 경로의 체크포인트를 전부 삭제한다', async () => {
    const route = makeRoute([]);

    await repository.update(route);

    expect(checkpointOrm.delete).toHaveBeenCalledWith({ routeId: 'route-1' });
    expect(checkpointOrm.save).not.toHaveBeenCalled();
  });
});
