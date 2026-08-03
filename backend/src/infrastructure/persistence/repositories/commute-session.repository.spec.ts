import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommuteSessionRepositoryImpl } from './commute-session.repository';
import { CommuteSessionEntity } from '../typeorm/commute-session.entity';
import { CheckpointRecordEntity } from '../typeorm/checkpoint-record.entity';

/**
 * 회귀 방지: `relations: ['checkpointRecords']`는 **정렬을 걸지 않는다**
 * (`commute-session.repository.ts`의 6개 finder 전부).
 *
 * Postgres는 ORDER BY 없는 조회의 행 순서를 보장하지 않으므로 도착 기록이
 * 임의 순서로 실려 온다. 그런데 소비자들은 배열 순서를 시간순으로 가정한다:
 *
 * - `manage-commute-session.use-case.ts:113` — 배열의 **마지막 원소**를 직전 도착으로 보고
 *   `durationFromPrevious = now - previousRecord.arrivedAt`를 계산해 **DB에 영구 저장**한다.
 *   순서가 뒤집히면 구간 소요시간·지연(`delayMinutes`)이 통째로 부풀려지고,
 *   그 값이 다시 구간별 통계(`calculate-route-analytics.use-case.ts:227`)의 입력이 된다.
 * - `commute-session.entity.ts`의 `getLongestSegment()`/`getMostDelayedSegment()`도
 *   같은 배열을 쓴다.
 *
 * 전용 리포지토리(`checkpoint-record.repository.ts:29`)는 이미
 * `order: { arrivedAt: 'ASC' }`를 걸고 있고, 테이블에도
 * `@Index(['sessionId', 'arrivedAt'])`가 있다 — 시간순이 원래 의도였다.
 *
 * 테스트가 이걸 못 잡던 이유: 테스트 DB는 SQLite라 삽입 순서대로 돌려주므로
 * 실제 Postgres에서만 드러난다. 그래서 ORM을 목으로 세워 역순을 강제한다.
 */
describe('CommuteSessionRepositoryImpl - 도착 기록은 항상 시간순이다', () => {
  let repository: CommuteSessionRepositoryImpl;
  let sessionOrm: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let recordOrm: { save: jest.Mock };

  const makeRecordEntity = (id: string, arrivedAt: Date): CheckpointRecordEntity => {
    const entity = new CheckpointRecordEntity();
    entity.id = id;
    entity.sessionId = 'session-1';
    entity.checkpointId = `cp-${id}`;
    entity.arrivedAt = arrivedAt;
    entity.actualWaitTime = 0;
    entity.delayMinutes = 0;
    entity.waitDelayMinutes = 0;
    return entity;
  };

  /** DB가 도착 순서와 무관하게 돌려주는 상황 (08:20 → 08:00 → 08:10) */
  const makeSessionEntity = (): CommuteSessionEntity => {
    const entity = new CommuteSessionEntity();
    entity.id = 'session-1';
    entity.userId = 'user-1';
    entity.routeId = 'route-1';
    entity.startedAt = new Date('2026-08-03T07:55:00Z');
    entity.totalWaitMinutes = 0;
    entity.totalDelayMinutes = 0;
    entity.status = 'in_progress';
    entity.createdAt = new Date('2026-08-03T07:55:00Z');
    entity.checkpointRecords = [
      makeRecordEntity('r3', new Date('2026-08-03T08:20:00Z')),
      makeRecordEntity('r1', new Date('2026-08-03T08:00:00Z')),
      makeRecordEntity('r2', new Date('2026-08-03T08:10:00Z')),
    ];
    return entity;
  };

  beforeEach(async () => {
    sessionOrm = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
    recordOrm = { save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommuteSessionRepositoryImpl,
        { provide: getRepositoryToken(CommuteSessionEntity), useValue: sessionOrm },
        { provide: getRepositoryToken(CheckpointRecordEntity), useValue: recordOrm },
      ],
    }).compile();

    repository = module.get(CommuteSessionRepositoryImpl);
  });

  it('findByIdWithRecords는 도착 시각 오름차순으로 기록을 돌려준다', async () => {
    sessionOrm.findOne.mockResolvedValue(makeSessionEntity());

    const session = await repository.findByIdWithRecords('session-1');

    expect(session!.checkpointRecords.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('배열의 마지막 원소가 가장 최근 도착이다 (직전 기록 계산의 전제)', async () => {
    sessionOrm.findOne.mockResolvedValue(makeSessionEntity());

    const session = await repository.findByIdWithRecords('session-1');
    const records = session!.checkpointRecords;
    const previous = records[records.length - 1];

    // 08:25에 다음 체크포인트를 찍으면 직전(08:20)과의 간격은 5분이어야 한다.
    // 정렬이 없으면 마지막 원소가 08:10이 되어 15분으로 기록된다.
    expect(previous.arrivedAt).toEqual(new Date('2026-08-03T08:20:00Z'));
  });

  it('findInProgressByUserId도 같은 순서 보장을 받는다', async () => {
    sessionOrm.findOne.mockResolvedValue(makeSessionEntity());

    const session = await repository.findInProgressByUserId('user-1');

    expect(session!.checkpointRecords.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('findByUserId의 각 세션도 시간순으로 정렬된다', async () => {
    sessionOrm.find.mockResolvedValue([makeSessionEntity()]);

    const sessions = await repository.findByUserId('user-1');

    expect(sessions[0].checkpointRecords.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('기록이 없는 세션은 빈 배열을 유지한다', async () => {
    const entity = makeSessionEntity();
    entity.checkpointRecords = undefined;
    sessionOrm.findOne.mockResolvedValue(entity);

    const session = await repository.findByIdWithRecords('session-1');

    expect(session!.checkpointRecords).toEqual([]);
  });
});
