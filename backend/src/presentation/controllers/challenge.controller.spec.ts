import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ChallengeController } from './challenge.controller';
import { ManageChallengeUseCase } from '@application/use-cases/manage-challenge.use-case';
import { ChallengeConflictError } from '@application/use-cases/manage-challenge.use-case';
import { ChallengeTemplate } from '@domain/entities/challenge-template.entity';
import { UserChallenge } from '@domain/entities/user-challenge.entity';
import { UserBadge } from '@domain/entities/user-badge.entity';

describe('ChallengeController', () => {
  let controller: ChallengeController;
  let manageChallengeUseCase: jest.Mocked<ManageChallengeUseCase>;

  const USER_ID = 'user-123';

  const mockRequest = (userId: string) =>
    ({
      user: { userId, email: `${userId}@test.com` },
    }) as any;

  const mockTemplate = new ChallengeTemplate({
    id: 'tpl-time-30',
    category: 'time_goal',
    name: '30분 출퇴근 챌린지',
    description: '출퇴근 시간을 30분 이내로 5회 달성하세요',
    targetValue: 5,
    conditionType: 'duration_under',
    conditionValue: 30,
    durationDays: 14,
    badgeId: 'badge-speed-runner',
    badgeName: '스피드 러너',
    badgeEmoji: '⚡',
    difficulty: 'easy',
    sortOrder: 1,
    isActive: true,
    createdAt: new Date('2026-01-01'),
  });

  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 14);

  const mockChallenge = new UserChallenge({
    id: 'challenge-1',
    userId: USER_ID,
    challengeTemplateId: 'tpl-time-30',
    status: 'active',
    startedAt: now,
    deadlineAt: deadline,
    completedAt: null,
    currentProgress: 2,
    targetProgress: 5,
    createdAt: now,
    updatedAt: now,
  });

  const mockBadge = new UserBadge({
    id: 'badge-instance-1',
    userId: USER_ID,
    badgeId: 'badge-speed-runner',
    badgeName: '스피드 러너',
    badgeEmoji: '⚡',
    challengeId: 'challenge-1',
    earnedAt: now,
    createdAt: now,
  });

  beforeEach(async () => {
    manageChallengeUseCase = {
      getTemplates: jest.fn(),
      joinChallenge: jest.fn(),
      getActiveChallenges: jest.fn(),
      abandonChallenge: jest.fn(),
      getChallengeHistory: jest.fn(),
      getBadges: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengeController],
      providers: [
        {
          provide: ManageChallengeUseCase,
          useValue: manageChallengeUseCase,
        },
      ],
    }).compile();

    controller = module.get<ChallengeController>(ChallengeController);
  });

  describe('getTemplates', () => {
    it('템플릿 목록과 카테고리를 반환한다', async () => {
      manageChallengeUseCase.getTemplates.mockResolvedValue([
        { template: mockTemplate, isJoined: false, isCompleted: false },
      ]);

      const result = await controller.getTemplates(mockRequest(USER_ID));

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe('tpl-time-30');
      expect(result.templates[0].name).toBe('30분 출퇴근 챌린지');
      expect(result.templates[0].isJoined).toBe(false);
      expect(result.templates[0].isCompleted).toBe(false);
      expect(result.categories).toHaveLength(3);
      expect(result.categories[0].key).toBe('time_goal');
      expect(manageChallengeUseCase.getTemplates).toHaveBeenCalledWith(USER_ID);
    });

    it('참여 중인 템플릿은 isJoined가 true이다', async () => {
      manageChallengeUseCase.getTemplates.mockResolvedValue([
        { template: mockTemplate, isJoined: true, isCompleted: false },
      ]);

      const result = await controller.getTemplates(mockRequest(USER_ID));

      expect(result.templates[0].isJoined).toBe(true);
    });
  });

  describe('joinChallenge', () => {
    it('도전 참여에 성공하면 챌린지 정보를 반환한다', async () => {
      manageChallengeUseCase.joinChallenge.mockResolvedValue(mockChallenge);

      const result = await controller.joinChallenge(
        mockRequest(USER_ID),
        { templateId: 'tpl-time-30' },
      );

      expect(result.id).toBe('challenge-1');
      expect(result.templateId).toBe('tpl-time-30');
      expect(result.status).toBe('active');
      expect(result.currentProgress).toBe(2);
      expect(result.targetProgress).toBe(5);
      expect(typeof result.startedAt).toBe('string');
      expect(typeof result.deadlineAt).toBe('string');
      expect(manageChallengeUseCase.joinChallenge).toHaveBeenCalledWith(
        USER_ID,
        'tpl-time-30',
      );
    });

    it('이미 참여 중인 챌린지에 참여하면 409 ConflictException을 던진다', async () => {
      manageChallengeUseCase.joinChallenge.mockRejectedValue(
        new ChallengeConflictError('이미 참여 중인 챌린지입니다.'),
      );

      await expect(
        controller.joinChallenge(mockRequest(USER_ID), { templateId: 'tpl-time-30' }),
      ).rejects.toThrow(ConflictException);
    });

    it('최대 동시 참여 수를 초과하면 409 ConflictException을 던진다', async () => {
      manageChallengeUseCase.joinChallenge.mockRejectedValue(
        new ChallengeConflictError('동시에 최대 3개의 챌린지만 참여할 수 있습니다.'),
      );

      await expect(
        controller.joinChallenge(mockRequest(USER_ID), { templateId: 'tpl-time-30' }),
      ).rejects.toThrow(ConflictException);
    });

    it('알 수 없는 에러는 그대로 전파한다', async () => {
      manageChallengeUseCase.joinChallenge.mockRejectedValue(
        new Error('DB connection error'),
      );

      await expect(
        controller.joinChallenge(mockRequest(USER_ID), { templateId: 'tpl-time-30' }),
      ).rejects.toThrow('DB connection error');
    });
  });

  describe('getActiveChallenges', () => {
    it('활성 도전 목록을 반환한다', async () => {
      manageChallengeUseCase.getActiveChallenges.mockResolvedValue([
        {
          id: 'challenge-1',
          template: mockTemplate,
          status: 'active',
          startedAt: now,
          deadlineAt: deadline,
          currentProgress: 2,
          targetProgress: 5,
          progressPercent: 40,
          daysRemaining: 14,
          isCloseToCompletion: false,
        },
      ]);

      const result = await controller.getActiveChallenges(mockRequest(USER_ID));

      expect(result.challenges).toHaveLength(1);
      expect(result.challenges[0].id).toBe('challenge-1');
      expect(result.challenges[0].template.name).toBe('30분 출퇴근 챌린지');
      expect(result.challenges[0].progressPercent).toBe(40);
      expect(typeof result.challenges[0].startedAt).toBe('string');
    });

    it('활성 도전이 없으면 빈 배열을 반환한다', async () => {
      manageChallengeUseCase.getActiveChallenges.mockResolvedValue([]);

      const result = await controller.getActiveChallenges(mockRequest(USER_ID));

      expect(result.challenges).toHaveLength(0);
    });
  });

  describe('abandonChallenge', () => {
    it('도전 포기에 성공하면 success: true를 반환한다', async () => {
      manageChallengeUseCase.abandonChallenge.mockResolvedValue(undefined);

      const result = await controller.abandonChallenge(
        mockRequest(USER_ID),
        'challenge-1',
      );

      expect(result).toEqual({ success: true });
      expect(manageChallengeUseCase.abandonChallenge).toHaveBeenCalledWith(
        USER_ID,
        'challenge-1',
      );
    });

    it('존재하지 않는 챌린지를 포기하면 에러를 전파한다', async () => {
      manageChallengeUseCase.abandonChallenge.mockRejectedValue(
        new Error('챌린지를 찾을 수 없습니다.'),
      );

      await expect(
        controller.abandonChallenge(mockRequest(USER_ID), 'nonexistent'),
      ).rejects.toThrow('챌린지를 찾을 수 없습니다.');
    });
  });

  describe('getChallengeHistory', () => {
    it('도전 히스토리를 반환한다', async () => {
      manageChallengeUseCase.getChallengeHistory.mockResolvedValue({
        challenges: [
          {
            id: 'challenge-1',
            template: mockTemplate,
            status: 'completed',
            startedAt: now,
            deadlineAt: deadline,
            currentProgress: 5,
            targetProgress: 5,
            progressPercent: 100,
            daysRemaining: 0,
            isCloseToCompletion: false,
          },
        ],
        totalCount: 1,
        stats: {
          totalCompleted: 1,
          totalFailed: 0,
          totalAbandoned: 0,
          completionRate: 100,
        },
      });

      const result = await controller.getChallengeHistory(mockRequest(USER_ID));

      expect(result.challenges).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.stats.totalCompleted).toBe(1);
      expect(result.stats.completionRate).toBe(100);
    });

    it('limit과 offset 쿼리 파라미터를 전달한다', async () => {
      manageChallengeUseCase.getChallengeHistory.mockResolvedValue({
        challenges: [],
        totalCount: 0,
        stats: { totalCompleted: 0, totalFailed: 0, totalAbandoned: 0, completionRate: 0 },
      });

      await controller.getChallengeHistory(mockRequest(USER_ID), '10', '5');

      expect(manageChallengeUseCase.getChallengeHistory).toHaveBeenCalledWith(
        USER_ID,
        10,
        5,
      );
    });

    it('limit과 offset이 없으면 기본값을 사용한다', async () => {
      manageChallengeUseCase.getChallengeHistory.mockResolvedValue({
        challenges: [],
        totalCount: 0,
        stats: { totalCompleted: 0, totalFailed: 0, totalAbandoned: 0, completionRate: 0 },
      });

      await controller.getChallengeHistory(mockRequest(USER_ID));

      expect(manageChallengeUseCase.getChallengeHistory).toHaveBeenCalledWith(
        USER_ID,
        20,
        0,
      );
    });
  });

  describe('getBadges', () => {
    it('배지 목록을 반환한다', async () => {
      manageChallengeUseCase.getBadges.mockResolvedValue({
        badges: [mockBadge],
        totalBadges: 6,
        earnedCount: 1,
      });

      const result = await controller.getBadges(mockRequest(USER_ID));

      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].badgeName).toBe('스피드 러너');
      expect(result.badges[0].badgeEmoji).toBe('⚡');
      expect(typeof result.badges[0].earnedAt).toBe('string');
      expect(result.totalBadges).toBe(6);
      expect(result.earnedCount).toBe(1);
    });

    it('배지가 없으면 빈 배열과 earnedCount 0을 반환한다', async () => {
      manageChallengeUseCase.getBadges.mockResolvedValue({
        badges: [],
        totalBadges: 6,
        earnedCount: 0,
      });

      const result = await controller.getBadges(mockRequest(USER_ID));

      expect(result.badges).toHaveLength(0);
      expect(result.earnedCount).toBe(0);
      expect(result.totalBadges).toBe(6);
    });
  });
});
