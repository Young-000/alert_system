import { DataSource } from 'typeorm';
import { SmartDepartureSettingRepositoryImpl } from './smart-departure-setting.repository';
import { SmartDepartureSettingEntity } from '../typeorm/smart-departure-setting.entity';
import { UserEntity } from '../typeorm/user.entity';
import { CommuteRouteEntity } from '../typeorm/commute-route.entity';
import { ALL_ENTITIES } from '../typeorm/entities';
import { SmartDepartureSetting } from '@domain/entities/smart-departure-setting.entity';

/**
 * 회귀 방지: `simple-array` 컬럼은 TypeORM이 하이드레이션 시점에 이미
 * string[]으로 변환해서 돌려준다. 이걸 string으로 보고 `.split()`을 걸면
 * DB에서 읽는 모든 경로가 `value.split is not a function`으로 500이 된다.
 * save()는 인메모리 엔티티를 그대로 돌려줘 하이드레이션을 안 거치므로
 * "저장은 되는데 조회만 죽는" 형태 — 실제 DB(sqljs) 왕복으로만 잡힌다.
 */
describe('SmartDepartureSettingRepositoryImpl (DB 왕복 하이드레이션)', () => {
  let dataSource: DataSource;
  let repository: SmartDepartureSettingRepositoryImpl;
  let userId: string;
  let routeId: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqljs',
      entities: ALL_ENTITIES,
      synchronize: true,
    });
    await dataSource.initialize();
    repository = new SmartDepartureSettingRepositoryImpl(
      dataSource.getRepository(SmartDepartureSettingEntity),
    );

    const user = await dataSource.getRepository(UserEntity).save({
      email: 'sd-test@example.com',
      name: '테스트',
      phoneNumber: '01012345678',
    });
    userId = user.id;

    const route = await dataSource.getRepository(CommuteRouteEntity).save({
      userId,
      name: '출근길',
      routeType: 'morning',
    });
    routeId = route.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('저장 후 findById로 다시 읽어도 activeDays/preAlerts가 숫자 배열로 돌아온다', async () => {
    const saved = await repository.save(
      SmartDepartureSetting.create(userId, routeId, 'commute', '09:00', {
        prepTimeMinutes: 30,
        activeDays: [1, 2, 3, 4, 5],
        preAlerts: [30, 10, 0],
      }),
    );

    const found = await repository.findById(saved.id);

    expect(found).toBeDefined();
    expect(found?.activeDays).toEqual([1, 2, 3, 4, 5]);
    expect(found?.preAlerts).toEqual([30, 10, 0]);
  });

  it('findByUserId / findActiveByUserId / findAllActive도 하이드레이션을 넘긴다', async () => {
    const byUser = await repository.findByUserId(userId);
    expect(byUser.length).toBeGreaterThan(0);
    expect(byUser[0].activeDays).toEqual([1, 2, 3, 4, 5]);

    const active = await repository.findActiveByUserId(userId);
    expect(active[0].preAlerts).toEqual([30, 10, 0]);

    const allActive = await repository.findAllActive();
    expect(allActive[0].activeDays).toEqual([1, 2, 3, 4, 5]);
  });

  it('빈 preAlerts도 왕복 후 빈 배열로 돌아온다', async () => {
    const saved = await repository.save(
      new SmartDepartureSetting(userId, routeId, 'return', '19:00', {
        preAlerts: [],
      }),
    );

    const found = await repository.findById(saved.id);

    expect(found?.preAlerts).toEqual([]);
  });
});
