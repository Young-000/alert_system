import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommuteRecordRepositoryImpl } from './commute-record.repository';
import { CommuteRecordEntity } from '../typeorm/commute-record.entity';
import { CommuteType } from '@domain/entities/commute-record.entity';

describe('CommuteRecordRepositoryImpl', () => {
  let repositoryImpl: CommuteRecordRepositoryImpl;
  let ormRepository: jest.Mocked<Repository<CommuteRecordEntity>>;

  /**
   * TypeORM hydrates Postgres `date` columns as 'YYYY-MM-DD' strings, so this
   * fixture reproduces what the driver actually returns at runtime.
   */
  const createHydratedEntity = (): CommuteRecordEntity => {
    const entity = new CommuteRecordEntity();
    entity.id = '11111111-1111-1111-1111-111111111111';
    entity.userId = '22222222-2222-2222-2222-222222222222';
    entity.commuteDate = '2026-07-24' as unknown as Date;
    entity.commuteType = 'morning';
    entity.createdAt = new Date('2026-07-24T00:00:00.000Z');
    return entity;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommuteRecordRepositoryImpl,
        {
          provide: getRepositoryToken(CommuteRecordEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    repositoryImpl = module.get(CommuteRecordRepositoryImpl);
    ormRepository = module.get(getRepositoryToken(CommuteRecordEntity));
  });

  describe('date column hydration', () => {
    it('should expose commuteDate as a Date even when the driver returns a string', async () => {
      ormRepository.findOne.mockResolvedValue(createHydratedEntity());

      const record = await repositoryImpl.findById('11111111-1111-1111-1111-111111111111');

      expect(record?.commuteDate).toBeInstanceOf(Date);
      // Domain services call getDay()/getMonth()/toISOString() on this value.
      expect(record?.commuteDate.toISOString().split('T')[0]).toBe('2026-07-24');
      expect(record?.commuteDate.getUTCDay()).toBe(5); // 2026-07-24 is a Friday
    });

    it('should keep an already-hydrated Date untouched', async () => {
      const entity = createHydratedEntity();
      const date = new Date('2026-07-24T00:00:00.000Z');
      entity.commuteDate = date;
      ormRepository.find.mockResolvedValue([entity]);

      const records = await repositoryImpl.findByUserId(entity.userId);

      expect(records[0].commuteDate).toBe(date);
    });
  });

  describe('findByUserIdAndType', () => {
    it('should map every returned entity to a domain record', async () => {
      ormRepository.find.mockResolvedValue([createHydratedEntity()]);

      const records = await repositoryImpl.findByUserIdAndType(
        '22222222-2222-2222-2222-222222222222',
        CommuteType.MORNING,
      );

      expect(records).toHaveLength(1);
      expect(records[0].commuteDate).toBeInstanceOf(Date);
    });
  });
});
