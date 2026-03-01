import { HttpException } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from '@application/services/community/community.service';
import { TipsService, TooManyTipsException } from '@application/services/community/tips.service';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

describe('CommunityController', () => {
  let controller: CommunityController;
  let mockCommunityService: jest.Mocked<CommunityService>;
  let mockTipsService: jest.Mocked<TipsService>;

  const mockRequest = {
    user: { userId: 'user-1', email: 'test@test.com' },
  } as AuthenticatedRequest;

  beforeEach(() => {
    mockCommunityService = {
      getNeighborStats: jest.fn(),
    } as never;

    mockTipsService = {
      getTips: jest.fn(),
      createTip: jest.fn(),
      reportTip: jest.fn(),
      toggleHelpful: jest.fn(),
    } as never;

    controller = new CommunityController(mockCommunityService, mockTipsService);
  });

  describe('GET /community/neighbors', () => {
    it('이웃 통계를 반환한다', async () => {
      const expected = {
        routeId: 'route-1',
        neighborCount: 23,
        avgDurationMinutes: 42,
        myAvgDurationMinutes: 38,
        diffMinutes: -4,
        dataStatus: 'sufficient' as const,
      };
      mockCommunityService.getNeighborStats.mockResolvedValue(expected);

      const result = await controller.getNeighbors(mockRequest);

      expect(result).toEqual(expected);
      expect(mockCommunityService.getNeighborStats).toHaveBeenCalledWith('user-1', undefined);
    });

    it('routeId 쿼리를 전달한다', async () => {
      mockCommunityService.getNeighborStats.mockResolvedValue({
        routeId: 'route-1',
        neighborCount: 0,
        avgDurationMinutes: null,
        myAvgDurationMinutes: null,
        diffMinutes: null,
        dataStatus: 'insufficient',
      });

      await controller.getNeighbors(mockRequest, 'route-1');

      expect(mockCommunityService.getNeighborStats).toHaveBeenCalledWith('user-1', 'route-1');
    });

    it('응답에 userId가 포함되지 않는다 (프라이버시)', async () => {
      const expected = {
        routeId: 'route-1',
        neighborCount: 5,
        avgDurationMinutes: 42,
        myAvgDurationMinutes: 38,
        diffMinutes: -4,
        dataStatus: 'sufficient' as const,
      };
      mockCommunityService.getNeighborStats.mockResolvedValue(expected);

      const result = await controller.getNeighbors(mockRequest);

      expect(result).not.toHaveProperty('userId');
      expect(result).not.toHaveProperty('neighborUserIds');
    });
  });

  describe('GET /community/tips', () => {
    it('팁 목록을 반환한다', async () => {
      const expected = {
        tips: [
          {
            id: 'tip-1',
            content: '4번 출구가 빨라요',
            helpfulCount: 3,
            createdAt: '2026-03-01T00:00:00.000Z',
            isHelpfulByMe: false,
            isReportedByMe: false,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        hasNext: false,
      };
      mockTipsService.getTips.mockResolvedValue(expected);

      const result = await controller.getTips(mockRequest, 'station:1');

      expect(result.tips[0]).not.toHaveProperty('authorId');
      expect(result.tips[0]).not.toHaveProperty('author');
    });

    it('페이지네이션 파라미터를 전달한다', async () => {
      mockTipsService.getTips.mockResolvedValue({
        tips: [],
        total: 0,
        page: 2,
        limit: 10,
        hasNext: false,
      });

      await controller.getTips(mockRequest, 'station:1', '2', '10');

      expect(mockTipsService.getTips).toHaveBeenCalledWith('station:1', 'user-1', 2, 10);
    });
  });

  describe('POST /community/tips', () => {
    it('팁을 생성한다', async () => {
      const expected = {
        id: 'new-tip',
        content: '4번 출구가 빨라요',
        createdAt: '2026-03-02T00:00:00.000Z',
      };
      mockTipsService.createTip.mockResolvedValue(expected);

      const result = await controller.createTip(mockRequest, {
        checkpointKey: 'station:1',
        content: '4번 출구가 빨라요',
      });

      expect(result).toEqual(expected);
      expect(result).not.toHaveProperty('authorId');
    });

    it('TooManyTipsException이면 429를 반환한다', async () => {
      mockTipsService.createTip.mockRejectedValue(new TooManyTipsException());

      await expect(
        controller.createTip(mockRequest, {
          checkpointKey: 'station:1',
          content: 'test',
        }),
      ).rejects.toThrow(HttpException);

      try {
        await controller.createTip(mockRequest, {
          checkpointKey: 'station:1',
          content: 'test',
        });
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(429);
      }
    });
  });

  describe('POST /community/tips/:id/report', () => {
    it('팁을 신고한다', async () => {
      mockTipsService.reportTip.mockResolvedValue({ message: '신고되었습니다.' });

      const result = await controller.reportTip(mockRequest, 'tip-1');

      expect(result.message).toBe('신고되었습니다.');
    });
  });

  describe('POST /community/tips/:id/helpful', () => {
    it('도움이 됐어요를 토글한다', async () => {
      mockTipsService.toggleHelpful.mockResolvedValue({
        message: '도움이 됐어요!',
        helpfulCount: 5,
        isHelpfulByMe: true,
      });

      const result = await controller.toggleHelpful(mockRequest, 'tip-1');

      expect(result.helpfulCount).toBe(5);
      expect(result.isHelpfulByMe).toBe(true);
    });
  });

  describe('프라이버시 검증', () => {
    it('모든 GET /community/* 응답에 user ID가 없다', async () => {
      // Neighbors
      mockCommunityService.getNeighborStats.mockResolvedValue({
        routeId: 'route-1',
        neighborCount: 5,
        avgDurationMinutes: 42,
        myAvgDurationMinutes: 38,
        diffMinutes: -4,
        dataStatus: 'sufficient',
      });

      const neighborResult = await controller.getNeighbors(mockRequest);
      const neighborJson = JSON.stringify(neighborResult);
      expect(neighborJson).not.toContain('user-1');
      expect(neighborJson).not.toContain('userId');

      // Tips
      mockTipsService.getTips.mockResolvedValue({
        tips: [
          {
            id: 'tip-1',
            content: 'test',
            helpfulCount: 0,
            createdAt: '2026-03-01T00:00:00.000Z',
            isHelpfulByMe: false,
            isReportedByMe: false,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        hasNext: false,
      });

      const tipsResult = await controller.getTips(mockRequest, 'station:1');
      const tipsJson = JSON.stringify(tipsResult);
      expect(tipsJson).not.toContain('authorId');
      expect(tipsJson).not.toContain('author_id');
    });

    it('POST /community/tips 응답에 authorId가 없다', async () => {
      mockTipsService.createTip.mockResolvedValue({
        id: 'new-tip',
        content: 'test',
        createdAt: '2026-03-02T00:00:00.000Z',
      });

      const result = await controller.createTip(mockRequest, {
        checkpointKey: 'station:1',
        content: 'test',
      });

      const json = JSON.stringify(result);
      expect(json).not.toContain('authorId');
      expect(json).not.toContain('user-1');
    });
  });
});
