import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { TipsService, TooManyTipsException } from './tips.service';
import { ICommunityTipRepository } from '@domain/repositories/community-tip.repository';
import { ICommunityTipReportRepository } from '@domain/repositories/community-tip-report.repository';
import { ICommunityTipHelpfulRepository } from '@domain/repositories/community-tip-helpful.repository';
import { CommunityTip } from '@domain/entities/community-tip.entity';
import { CommunityTipReport } from '@domain/entities/community-tip-report.entity';

describe('TipsService', () => {
  let service: TipsService;
  let mockTipRepo: jest.Mocked<ICommunityTipRepository>;
  let mockReportRepo: jest.Mocked<ICommunityTipReportRepository>;
  let mockHelpfulRepo: jest.Mocked<ICommunityTipHelpfulRepository>;
  let mockSessionRepo: { count: jest.Mock };

  beforeEach(() => {
    mockTipRepo = {
      findById: jest.fn(),
      findByCheckpointKey: jest.fn(),
      countByCheckpointKey: jest.fn(),
      countUserTipsToday: jest.fn(),
      save: jest.fn(),
      incrementReportCount: jest.fn(),
      markHidden: jest.fn(),
      incrementHelpfulCount: jest.fn(),
      decrementHelpfulCount: jest.fn(),
    };

    mockReportRepo = {
      findByTipAndReporter: jest.fn(),
      save: jest.fn(),
    };

    mockHelpfulRepo = {
      exists: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      findUserHelpfulTipIds: jest.fn(),
    };

    mockSessionRepo = {
      count: jest.fn(),
    };

    service = new TipsService(
      mockTipRepo,
      mockReportRepo,
      mockHelpfulRepo,
      mockSessionRepo as never,
    );
  });

  describe('getTips', () => {
    it('팁 목록을 반환한다 (비로그인)', async () => {
      const tips = [
        createMockTip('tip-1', '4번 출구가 빨라요'),
        createMockTip('tip-2', '에스컬레이터가 있어요'),
      ];
      mockTipRepo.findByCheckpointKey.mockResolvedValue(tips);
      mockTipRepo.countByCheckpointKey.mockResolvedValue(2);

      const result = await service.getTips('station:1', null, 1, 20);

      expect(result.tips).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.hasNext).toBe(false);
    });

    it('팁에 author 정보가 포함되지 않는다 (프라이버시)', async () => {
      const tips = [createMockTip('tip-1', 'test', 'secret-user-id')];
      mockTipRepo.findByCheckpointKey.mockResolvedValue(tips);
      mockTipRepo.countByCheckpointKey.mockResolvedValue(1);

      const result = await service.getTips('station:1', null, 1, 20);

      const tipDto = result.tips[0];
      expect(tipDto).not.toHaveProperty('authorId');
      expect(tipDto).not.toHaveProperty('author');
      expect(tipDto).toHaveProperty('id');
      expect(tipDto).toHaveProperty('content');
      expect(tipDto).toHaveProperty('createdAt');
    });

    it('로그인 사용자의 신고/도움 상태를 포함한다', async () => {
      const tips = [
        createMockTip('tip-1', 'test 1'),
        createMockTip('tip-2', 'test 2'),
      ];
      mockTipRepo.findByCheckpointKey.mockResolvedValue(tips);
      mockTipRepo.countByCheckpointKey.mockResolvedValue(2);
      mockReportRepo.findByTipAndReporter
        .mockResolvedValueOnce(new CommunityTipReport({ tipId: 'tip-1', reporterId: 'user-1' }))
        .mockResolvedValueOnce(null);
      mockHelpfulRepo.findUserHelpfulTipIds.mockResolvedValue(['tip-2']);

      const result = await service.getTips('station:1', 'user-1', 1, 20);

      expect(result.tips[0].isReportedByMe).toBe(true);
      expect(result.tips[0].isHelpfulByMe).toBe(false);
      expect(result.tips[1].isReportedByMe).toBe(false);
      expect(result.tips[1].isHelpfulByMe).toBe(true);
    });

    it('페이지네이션이 올바르게 동작한다', async () => {
      mockTipRepo.findByCheckpointKey.mockResolvedValue([]);
      mockTipRepo.countByCheckpointKey.mockResolvedValue(45);

      const result = await service.getTips('station:1', null, 1, 20);

      expect(result.hasNext).toBe(true);
      expect(mockTipRepo.findByCheckpointKey).toHaveBeenCalledWith({
        checkpointKey: 'station:1',
        page: 1,
        limit: 20,
      });
    });

    it('page를 음수로 입력하면 1로 보정한다', async () => {
      mockTipRepo.findByCheckpointKey.mockResolvedValue([]);
      mockTipRepo.countByCheckpointKey.mockResolvedValue(0);

      await service.getTips('station:1', null, -1, 20);

      expect(mockTipRepo.findByCheckpointKey).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      );
    });

    it('limit을 50 초과로 입력하면 50으로 보정한다', async () => {
      mockTipRepo.findByCheckpointKey.mockResolvedValue([]);
      mockTipRepo.countByCheckpointKey.mockResolvedValue(0);

      await service.getTips('station:1', null, 1, 100);

      expect(mockTipRepo.findByCheckpointKey).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });
  });

  describe('createTip', () => {
    it('유효한 팁을 생성한다', async () => {
      mockSessionRepo.count.mockResolvedValue(5);
      mockTipRepo.countUserTipsToday.mockResolvedValue(0);
      mockTipRepo.save.mockImplementation(async (tip) => new CommunityTip({
        ...tip,
        id: 'new-tip-id',
        createdAt: new Date('2026-03-02'),
      }));

      const result = await service.createTip('user-1', {
        checkpointKey: 'station:1',
        content: '4번 출구가 빨라요',
      });

      expect(result.id).toBe('new-tip-id');
      expect(result.content).toBe('4번 출구가 빨라요');
    });

    it('내용을 trim해서 저장한다', async () => {
      mockSessionRepo.count.mockResolvedValue(5);
      mockTipRepo.countUserTipsToday.mockResolvedValue(0);
      mockTipRepo.save.mockImplementation(async (tip) => tip);

      await service.createTip('user-1', {
        checkpointKey: 'station:1',
        content: '  공백 제거 테스트  ',
      });

      expect(mockTipRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ content: '공백 제거 테스트' }),
      );
    });

    it('빈 내용이면 BadRequest를 반환한다', async () => {
      await expect(
        service.createTip('user-1', {
          checkpointKey: 'station:1',
          content: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('100자 초과하면 BadRequest를 반환한다', async () => {
      await expect(
        service.createTip('user-1', {
          checkpointKey: 'station:1',
          content: 'a'.repeat(101),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('URL이 포함되면 BadRequest를 반환한다', async () => {
      await expect(
        service.createTip('user-1', {
          checkpointKey: 'station:1',
          content: 'https://example.com 참고',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('세션 3회 미만이면 BadRequest를 반환한다', async () => {
      mockSessionRepo.count.mockResolvedValue(2);

      await expect(
        service.createTip('user-1', {
          checkpointKey: 'station:1',
          content: '유효한 팁',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('하루 3개 초과하면 TooManyTipsException을 던진다', async () => {
      mockSessionRepo.count.mockResolvedValue(5);
      mockTipRepo.countUserTipsToday.mockResolvedValue(3);

      await expect(
        service.createTip('user-1', {
          checkpointKey: 'station:1',
          content: '4번째 팁',
        }),
      ).rejects.toThrow(TooManyTipsException);
    });

    it('하루 3개 미만이면 팁을 생성한다', async () => {
      mockSessionRepo.count.mockResolvedValue(5);
      mockTipRepo.countUserTipsToday.mockResolvedValue(2);
      mockTipRepo.save.mockImplementation(async (tip) => new CommunityTip({
        ...tip,
        id: 'tip-id',
      }));

      const result = await service.createTip('user-1', {
        checkpointKey: 'station:1',
        content: '3번째 팁',
      });

      expect(result.id).toBe('tip-id');
    });
  });

  describe('reportTip', () => {
    it('팁을 신고한다', async () => {
      const tip = createMockTip('tip-1', 'bad tip', 'author-1', 0);
      mockTipRepo.findById.mockResolvedValue(tip);
      mockReportRepo.findByTipAndReporter.mockResolvedValue(null);
      mockReportRepo.save.mockImplementation(async (r) => r);

      const result = await service.reportTip('tip-1', 'reporter-1');

      expect(result.message).toBe('신고되었습니다.');
      expect(mockTipRepo.incrementReportCount).toHaveBeenCalledWith('tip-1');
    });

    it('존재하지 않는 팁이면 NotFoundException을 던진다', async () => {
      mockTipRepo.findById.mockResolvedValue(null);

      await expect(
        service.reportTip('nonexistent', 'reporter-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('숨겨진 팁이면 NotFoundException을 던진다', async () => {
      const tip = new CommunityTip({
        id: 'tip-1',
        checkpointKey: 'station:1',
        authorId: 'author-1',
        content: 'hidden tip',
        isHidden: true,
      });
      mockTipRepo.findById.mockResolvedValue(tip);

      await expect(
        service.reportTip('tip-1', 'reporter-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('이미 신고한 팁이면 ConflictException을 던진다', async () => {
      const tip = createMockTip('tip-1', 'bad tip');
      mockTipRepo.findById.mockResolvedValue(tip);
      mockReportRepo.findByTipAndReporter.mockResolvedValue(
        new CommunityTipReport({ tipId: 'tip-1', reporterId: 'reporter-1' }),
      );

      await expect(
        service.reportTip('tip-1', 'reporter-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('3번째 신고에서 auto-hide된다', async () => {
      const tip = new CommunityTip({
        id: 'tip-1',
        checkpointKey: 'station:1',
        authorId: 'author-1',
        content: 'bad tip',
        reportCount: 2, // already 2 reports
      });
      mockTipRepo.findById.mockResolvedValue(tip);
      mockReportRepo.findByTipAndReporter.mockResolvedValue(null);
      mockReportRepo.save.mockImplementation(async (r) => r);

      await service.reportTip('tip-1', 'reporter-3');

      expect(mockTipRepo.markHidden).toHaveBeenCalledWith('tip-1');
    });

    it('2번째 신고에서는 auto-hide되지 않는다', async () => {
      const tip = new CommunityTip({
        id: 'tip-1',
        checkpointKey: 'station:1',
        authorId: 'author-1',
        content: 'bad tip',
        reportCount: 1, // 1 existing report
      });
      mockTipRepo.findById.mockResolvedValue(tip);
      mockReportRepo.findByTipAndReporter.mockResolvedValue(null);
      mockReportRepo.save.mockImplementation(async (r) => r);

      await service.reportTip('tip-1', 'reporter-2');

      expect(mockTipRepo.markHidden).not.toHaveBeenCalled();
    });
  });

  describe('toggleHelpful', () => {
    it('도움이 됐어요를 추가한다', async () => {
      const tip = createMockTip('tip-1', 'good tip', 'author-1', 0, 5);
      mockTipRepo.findById.mockResolvedValue(tip);
      mockHelpfulRepo.exists.mockResolvedValue(false);

      const result = await service.toggleHelpful('tip-1', 'user-1');

      expect(result.isHelpfulByMe).toBe(true);
      expect(result.helpfulCount).toBe(6);
      expect(mockHelpfulRepo.save).toHaveBeenCalledWith('tip-1', 'user-1');
      expect(mockTipRepo.incrementHelpfulCount).toHaveBeenCalledWith('tip-1');
    });

    it('이미 도움이 됐어요면 취소한다', async () => {
      const tip = createMockTip('tip-1', 'good tip', 'author-1', 0, 5);
      mockTipRepo.findById.mockResolvedValue(tip);
      mockHelpfulRepo.exists.mockResolvedValue(true);
      mockHelpfulRepo.remove.mockResolvedValue(true);

      const result = await service.toggleHelpful('tip-1', 'user-1');

      expect(result.isHelpfulByMe).toBe(false);
      expect(result.helpfulCount).toBe(4);
      expect(mockHelpfulRepo.remove).toHaveBeenCalledWith('tip-1', 'user-1');
      expect(mockTipRepo.decrementHelpfulCount).toHaveBeenCalledWith('tip-1');
    });

    it('존재하지 않는 팁이면 NotFoundException을 던진다', async () => {
      mockTipRepo.findById.mockResolvedValue(null);

      await expect(
        service.toggleHelpful('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('숨겨진 팁이면 NotFoundException을 던진다', async () => {
      const tip = new CommunityTip({
        id: 'tip-1',
        checkpointKey: 'station:1',
        authorId: 'author-1',
        content: 'hidden',
        isHidden: true,
      });
      mockTipRepo.findById.mockResolvedValue(tip);

      await expect(
        service.toggleHelpful('tip-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

function createMockTip(
  id: string,
  content: string,
  authorId = 'author-1',
  reportCount = 0,
  helpfulCount = 0,
): CommunityTip {
  return new CommunityTip({
    id,
    checkpointKey: 'station:1',
    authorId,
    content,
    reportCount,
    helpfulCount,
    createdAt: new Date('2026-03-01'),
  });
}
