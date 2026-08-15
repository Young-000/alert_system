import { DataSource } from 'typeorm';
import { SmartDepartureSnapshotRepositoryImpl } from './smart-departure-snapshot.repository';
import { SmartDepartureSnapshotEntity } from '../typeorm/smart-departure-snapshot.entity';
import { SmartDepartureSettingEntity } from '../typeorm/smart-departure-setting.entity';
import { UserEntity } from '../typeorm/user.entity';
import { CommuteRouteEntity } from '../typeorm/commute-route.entity';
import { ALL_ENTITIES } from '../typeorm/entities';
import { SmartDepartureSnapshot } from '@domain/entities/smart-departure-snapshot.entity';

/**
 * 회귀 방지: `simple-array` 컬럼(alerts_sent, schedule_ids)은 TypeORM이
 * 하이드레이션 시점에 string[]으로 변환한다. string 취급으로 `.split()`을
 * 걸면 모든 조회 경로가 죽는다. setting 리포지토리 spec과 같은 계열.
 */
/**
 * ALL_ENTITIES(38개) 메타데이터 빌드 + synchronize는 부하가 걸린 러너에서
 * jest 기본 훅 제한(5초)을 넘길 수 있다. 넘기면 beforeAll이 중단돼
 * 이 describe의 테스트가 전부 실패하므로 명시적으로 여유를 준다.
 */
const DB_SETUP_TIMEOUT_MS = 30_000;

describe('SmartDepartureSnapshotRepositoryImpl (DB 왕복 하이드레이션)', () => {
  let dataSource: DataSource;
  let repository: SmartDepartureSnapshotRepositoryImpl;
  let userId: string;
  let settingId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqljs',
      entities: ALL_ENTITIES,
      synchronize: true,
    });
    await dataSource.initialize();
    repository = new SmartDepartureSnapshotRepositoryImpl(
      dataSource.getRepository(SmartDepartureSnapshotEntity),
    );

    const user = await dataSource.getRepository(UserEntity).save({
      email: 'sd-snapshot-test@example.com',
      name: '테스트',
      phoneNumber: '01012345678',
    });
    userId = user.id;

    const route = await dataSource.getRepository(CommuteRouteEntity).save({
      userId,
      name: '출근길',
      routeType: 'morning',
    });

    const setting = await dataSource.getRepository(SmartDepartureSettingEntity).save({
      userId,
      routeId: route.id,
      departureType: 'commute',
      arrivalTarget: '09:00',
      prepTimeMinutes: 30,
      isEnabled: true,
      activeDays: ['1', '2', '3', '4', '5'],
      preAlerts: ['30', '10', '0'],
    });
    settingId = setting.id;
  }, DB_SETUP_TIMEOUT_MS);

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('저장 후 findById로 다시 읽어도 alertsSent/scheduleIds가 배열로 돌아온다', async () => {
    const saved = await repository.save(
      new SmartDepartureSnapshot(
        userId,
        settingId,
        '2026-08-08',
        'commute',
        '09:00',
        45,
        30,
        new Date('2026-08-08T07:45:00+09:00'),
        {
          alertsSent: [30, 10],
          scheduleIds: ['sched-a', 'sched-b'],
        },
      ),
    );

    const found = await repository.findById(saved.id);

    expect(found).toBeDefined();
    expect(found?.alertsSent).toEqual([30, 10]);
    expect(found?.scheduleIds).toEqual(['sched-a', 'sched-b']);
    expect(found?.departureDate).toBe('2026-08-08');
  });

  it('빈 alertsSent/scheduleIds도 왕복 후 빈 배열로 돌아온다', async () => {
    const saved = await repository.save(
      new SmartDepartureSnapshot(
        userId,
        settingId,
        '2026-08-09',
        'commute',
        '09:00',
        40,
        30,
        new Date('2026-08-09T07:50:00+09:00'),
      ),
    );

    const found = await repository.findById(saved.id);

    expect(found?.alertsSent).toEqual([]);
    expect(found?.scheduleIds).toEqual([]);
  });

  it('findBySettingAndDate / findByUserIdInDateRange도 하이드레이션을 넘긴다', async () => {
    const bySetting = await repository.findBySettingAndDate(settingId, '2026-08-08');
    expect(bySetting?.alertsSent).toEqual([30, 10]);

    const inRange = await repository.findByUserIdInDateRange(
      userId,
      '2026-08-01',
      '2026-08-31',
    );
    expect(inRange.length).toBe(2);
    expect(inRange[0].scheduleIds).toBeInstanceOf(Array);
  });
});
