import { FindOperator } from 'typeorm';
import { CommunityTipRepositoryImpl } from './community-tip.repository';
import { CommunityTipEntity } from '../typeorm/community-tip.entity';

type CountArgs = { where: { authorId: string; createdAt: FindOperator<Date> } };

describe('CommunityTipRepositoryImpl', () => {
  describe('countUserTipsToday', () => {
    // 서버 TZ는 UTC다. "오늘"의 경계는 KST 자정이어야 하고,
    // 그 경계는 UTC로 전날 15:00이다.
    const cases = [
      // KST 자정 직후 — UTC로는 아직 전날이다. 여기서 UTC 자정을 쓰면
      // 어제 쓴 글까지 오늘치로 세어 하루 등록 한도가 헐거워진다.
      { now: '2026-08-11T15:30:00Z', expectedBoundary: '2026-08-11T15:00:00Z' },
      // KST 오후 — UTC와 날짜가 같은 구간
      { now: '2026-08-12T05:00:00Z', expectedBoundary: '2026-08-11T15:00:00Z' },
      // KST 자정 직전
      { now: '2026-08-12T14:59:00Z', expectedBoundary: '2026-08-11T15:00:00Z' },
    ];

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each(cases)(
      '$now 시점의 경계는 KST 자정($expectedBoundary)이다',
      async ({ now, expectedBoundary }) => {
        jest.useFakeTimers().setSystemTime(new Date(now));

        const count = jest.fn().mockResolvedValue(3);
        const repository = new CommunityTipRepositoryImpl({
          count,
        } as unknown as import('typeorm').Repository<CommunityTipEntity>);

        await expect(repository.countUserTipsToday('user-1')).resolves.toBe(3);

        const args = count.mock.calls[0][0] as CountArgs;
        expect(args.where.authorId).toBe('user-1');
        expect(args.where.createdAt.value).toEqual(new Date(expectedBoundary));
      },
    );
  });
});
