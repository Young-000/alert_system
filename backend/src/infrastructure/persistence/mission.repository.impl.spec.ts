import { DataSource } from 'typeorm';
import { MissionRepositoryImpl } from './mission.repository.impl';
import { MissionEntity } from './typeorm/mission.entity';
import { DailyMissionRecordEntity } from './typeorm/daily-mission-record.entity';
import { MissionScoreEntity } from './typeorm/mission-score.entity';
import { UserEntity } from './typeorm/user.entity';
import { ALL_ENTITIES } from './typeorm/entities';
import { MissionScore } from '@domain/entities/mission-score.entity';

/**
 * 회귀 방지: `findLatestStreak`이 "오늘 저장된 행"까지 포함해 버리면
 * recalculateScore가 매 토글마다 오늘 행을 저장하는 구조상, 두 번째
 * 토글부터 previousStreak이 "어제까지의 연속일"이 아니라 "방금 저장한 오늘
 * 값"이 된다 → 미션 2개 이상인 사용자는 스트릭이 매일 1로 리셋된다.
 * (어제 5 → 오늘 전부 완료해도 6이 아니라 1)
 */
describe('MissionRepositoryImpl.findLatestStreak (DB 왕복)', () => {
  let dataSource: DataSource;
  let repository: MissionRepositoryImpl;
  let userId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqljs',
      entities: ALL_ENTITIES,
      synchronize: true,
    });
    await dataSource.initialize();
    repository = new MissionRepositoryImpl(
      dataSource.getRepository(MissionEntity),
      dataSource.getRepository(DailyMissionRecordEntity),
      dataSource.getRepository(MissionScoreEntity),
    );

    const user = await dataSource.getRepository(UserEntity).save({
      email: 'mission-streak@example.com',
      name: '테스트',
      phoneNumber: '01012345678',
    });
    userId = user.id;

    // 어제: 100% 달성, 스트릭 5
    await repository.saveScore(
      new MissionScore({
        userId,
        date: '2026-08-07',
        totalMissions: 3,
        completedMissions: 3,
        completionRate: 100,
        streakDay: 5,
      }),
    );
    // 오늘: 첫 토글 직후 33% → 스트릭 0으로 이미 저장된 상태
    await repository.saveScore(
      new MissionScore({
        userId,
        date: '2026-08-08',
        totalMissions: 3,
        completedMissions: 1,
        completionRate: 33,
        streakDay: 0,
      }),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('beforeDate를 주면 그 날짜 이전(exclusive)의 최신 스트릭을 반환한다', async () => {
    // 오늘 행(streak 0)이 이미 있어도 previousStreak은 어제의 5여야 한다
    const previous = await repository.findLatestStreak(userId, '2026-08-08');
    expect(previous).toBe(5);
  });

  it('beforeDate가 없으면 최신 행(오늘 포함)을 반환한다 — 현재 스트릭 표시용', async () => {
    const latest = await repository.findLatestStreak(userId);
    expect(latest).toBe(0);
  });

  it('beforeDate 이전 행이 없으면 0을 반환한다', async () => {
    const none = await repository.findLatestStreak(userId, '2026-08-07');
    expect(none).toBe(0);
  });
});
