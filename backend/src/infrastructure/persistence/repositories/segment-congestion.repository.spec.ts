import { FindOperator } from 'typeorm';
import { SegmentCongestionRepositoryImpl } from './segment-congestion.repository';
import { SegmentCongestionEntity } from '../typeorm/segment-congestion.entity';
import { MINIMUM_SAMPLES } from '@domain/entities/segment-congestion.entity';

type FindArgs = {
  where: {
    timeSlot: string;
    congestionLevel?: string;
    sampleCount?: FindOperator<number>;
  };
  take?: number;
};

function createRepository(find: jest.Mock): SegmentCongestionRepositoryImpl {
  return new SegmentCongestionRepositoryImpl({
    find,
  } as unknown as import('typeorm').Repository<SegmentCongestionEntity>);
}

describe('SegmentCongestionRepositoryImpl', () => {
  describe('findByTimeSlot', () => {
    // 표본이 모자란 구간은 목록에서도 걸러야 한다. 걸러내기를 서비스에서 하면
    // `limit`이 걸러지기 전 행에 걸려, 보여줄 수 있는 구간이 남아 있는데도
    // 목록이 짧게 잘린다. 그래서 임계값은 조회 조건으로 내려보낸다.
    it('minSampleCount를 sampleCount 하한 조건으로 내려보낸다', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const repository = createRepository(find);

      await repository.findByTimeSlot('morning_rush', {
        minSampleCount: MINIMUM_SAMPLES,
      });

      const args = find.mock.calls[0][0] as FindArgs;
      expect(args.where.sampleCount).toBeDefined();
      expect(args.where.sampleCount?.type).toBe('moreThanOrEqual');
      expect(args.where.sampleCount?.value).toBe(MINIMUM_SAMPLES);
    });

    it('minSampleCount가 없으면 sampleCount 조건을 걸지 않는다', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const repository = createRepository(find);

      await repository.findByTimeSlot('morning_rush');

      const args = find.mock.calls[0][0] as FindArgs;
      expect(args.where.sampleCount).toBeUndefined();
      expect(args.where.timeSlot).toBe('morning_rush');
    });

    it('level 필터와 limit은 그대로 유지된다', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const repository = createRepository(find);

      await repository.findByTimeSlot('evening_rush', {
        level: 'high',
        limit: 10,
        minSampleCount: MINIMUM_SAMPLES,
      });

      const args = find.mock.calls[0][0] as FindArgs;
      expect(args.where.congestionLevel).toBe('high');
      expect(args.take).toBe(10);
    });
  });
});
