import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { CommuteRecordRepositoryImpl } from './commute-record.repository';
import { CommuteRecordEntity } from '../typeorm/commute-record.entity';
import { CommuteRecord, CommuteType } from '@domain/entities/commute-record.entity';

/**
 * 회귀 방지: TypeORM은 `type: 'date'` 컬럼을 Date가 아니라 'YYYY-MM-DD' **문자열**로
 * hydrate한다 (PostgresDriver.prepareHydratedValue → DateUtils.mixedDateToDateString).
 * 과거 `CommuteRecord.commuteDate`가 `Date`로 선언돼 있어 소비자들이 `.getDay()` /
 * `.toISOString()`을 호출했고, 프로덕션에서 TypeError로 터졌다. 단위 테스트가 이를 놓친
 * 이유는 스펙이 항상 `new Date(...)`를 직접 넣어 실제 hydration 경로를 재현하지 않았기 때문이다.
 */
describe('CommuteRecordRepositoryImpl', () => {
  let repository: CommuteRecordRepositoryImpl;
  let ormRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };

  /** TypeORM이 DB에서 읽어온 뒤 애플리케이션에 넘기는 실제 엔티티 모양 */
  const hydratedEntity = (commuteDate: string): CommuteRecordEntity =>
    ({
      id: 'rec-1',
      userId: 'user-1',
      alertId: 'alert-1',
      commuteDate,
      commuteType: 'morning',
      scheduledDeparture: '08:00',
      actualDeparture: new Date('2026-07-27T08:05:00Z'),
      weatherCondition: 'clear',
      transitDelayMinutes: 0,
      notes: undefined,
      createdAt: new Date('2026-07-27T08:05:00Z'),
    }) as unknown as CommuteRecordEntity;

  beforeEach(async () => {
    ormRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommuteRecordRepositoryImpl,
        { provide: getRepositoryToken(CommuteRecordEntity), useValue: ormRepository },
      ],
    }).compile();

    repository = module.get(CommuteRecordRepositoryImpl);
  });

  it('TypeORM은 date 컬럼을 문자열로 hydrate한다 (이 테스트의 전제)', () => {
    const hydrated = DateUtils.mixedDateToDateString(new Date(2026, 6, 27), { utc: false });
    expect(typeof hydrated).toBe('string');
    expect(hydrated).toBe('2026-07-27');
  });

  it('문자열로 hydrate된 commuteDate를 날짜 전용 문자열 그대로 노출한다', async () => {
    ormRepository.find.mockResolvedValue([hydratedEntity('2026-07-27')]);

    const [record] = await repository.findByUserIdAndType('user-1', CommuteType.MORNING);

    expect(record.commuteDate).toBe('2026-07-27');
  });

  it('hydrate된 기록에 Date 메서드를 기대하는 소비자가 없어야 한다', async () => {
    ormRepository.find.mockResolvedValue([hydratedEntity('2026-07-27')]);

    const [record] = await repository.findByUserIdAndType('user-1', CommuteType.MORNING);

    // 과거 버그: 소비자들이 record.commuteDate.getDay()를 호출해 TypeError로 죽었다.
    expect((record.commuteDate as unknown as Date).getDay).toBeUndefined();
  });

  it('저장 시 도메인의 날짜 전용 문자열을 그대로 엔티티에 싣는다', async () => {
    ormRepository.save.mockResolvedValue(undefined);

    await repository.save(
      new CommuteRecord('user-1', '2026-07-27', CommuteType.MORNING, { id: 'rec-1' }),
    );

    expect(ormRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ commuteDate: '2026-07-27' }),
    );
  });

  it('날짜 전용 컬럼을 시각이 붙은 Date와 비교하지 않는다', async () => {
    ormRepository.find.mockResolvedValue([]);

    // KST 월요일 07:30에 해당하는 순간 (UTC로는 일요일 22:30)
    await repository.findRecentByUserId('user-1', 0);

    const where = ormRepository.find.mock.calls[0][0].where;
    expect(typeof where.commuteDate.value).toBe('string');
    expect(where.commuteDate.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
