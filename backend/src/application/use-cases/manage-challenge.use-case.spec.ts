import { ManageChallengeUseCase, ChallengeConflictError } from './manage-challenge.use-case';
import { ChallengeRepository } from '@domain/repositories/challenge.repository';
import { ChallengeTemplate } from '@domain/entities/challenge-template.entity';
import { UserChallenge } from '@domain/entities/user-challenge.entity';
import { UserBadge } from '@domain/entities/user-badge.entity';

describe('ManageChallengeUseCase', () => {
  let useCase: ManageChallengeUseCase;
  let challengeRepo: jest.Mocked<ChallengeRepository>;

  const userId = 'user-123';

  const makeTemplate = (
    overrides: Partial<ConstructorParameters<typeof ChallengeTemplate>[0]> = {},
  ): ChallengeTemplate => {
    return new ChallengeTemplate({
      id: 'time-under-40',
      category: 'time_goal',
      name: '40분 이내 출근 3회',
      description: '테스트 설명',
      targetValue: 3,
      conditionType: 'duration_under',
      conditionValue: 40,
      durationDays: 7,
      badgeId: 'lightning',
      badgeName: '번개',
      badgeEmoji: '⚡',
      difficulty: 'easy',
      sortOrder: 1,
      ...overrides,
    });
  };

  const makeActiveChallenge = (
    overrides: Partial<{
      id: string;
      userId: string;
      templateId: string;
      currentProgress: number;
      targetProgress: number;
      status: string;
      deadlineAt: Date;
    }> = {},
  ): UserChallenge => {
    const deadline = overrides.deadlineAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return new UserChallenge({
      id: overrides.id ?? 'challenge-1',
      userId: overrides.userId ?? userId,
      challengeTemplateId: overrides.templateId ?? 'time-under-40',
      status: (overrides.status as any) ?? 'active',
      startedAt: new Date(),
      deadlineAt: deadline,
      completedAt: null,
      currentProgress: overrides.currentProgress ?? 0,
      targetProgress: overrides.targetProgress ?? 3,
    });
  };

  beforeEach(() => {
    challengeRepo = {
      findAllTemplates: jest.fn(),
      findTemplateById: jest.fn(),
      findActiveChallengesByUserId: jest.fn(),
      findChallengeById: jest.fn(),
      findActiveByUserAndTemplate: jest.fn(),
      countActiveChallenges: jest.fn(),
      findChallengeHistory: jest.fn(),
      saveChallenge: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      findBadgesByUserId: jest.fn(),
      findBadgeByUserAndBadgeId: jest.fn(),
      saveBadge: jest.fn().mockImplementation((b) => Promise.resolve(b)),
      countTotalBadges: jest.fn(),
    };
    useCase = new ManageChallengeUseCase(challengeRepo);
  });

  describe('joinChallenge', () => {
    it('정상적으로 챌린지에 참여한다', async () => {
      const template = makeTemplate();
      challengeRepo.findTemplateById.mockResolvedValue(template);
      challengeRepo.countActiveChallenges.mockResolvedValue(0);
      challengeRepo.findActiveByUserAndTemplate.mockResolvedValue(null);

      const result = await useCase.joinChallenge(userId, 'time-under-40');

      expect(result.userId).toBe(userId);
      expect(result.challengeTemplateId).toBe('time-under-40');
      expect(result.status).toBe('active');
      expect(result.currentProgress).toBe(0);
      expect(result.targetProgress).toBe(3);
      expect(challengeRepo.saveChallenge).toHaveBeenCalled();
    });

    it('존재하지 않는 템플릿이면 에러를 던진다', async () => {
      challengeRepo.findTemplateById.mockResolvedValue(null);

      await expect(useCase.joinChallenge(userId, 'non-existent')).rejects.toThrow(
        '챌린지 템플릿을 찾을 수 없습니다.',
      );
    });

    it('활성 챌린지가 3개면 ChallengeConflictError를 던진다', async () => {
      const template = makeTemplate();
      challengeRepo.findTemplateById.mockResolvedValue(template);
      challengeRepo.countActiveChallenges.mockResolvedValue(3);

      await expect(useCase.joinChallenge(userId, 'time-under-40')).rejects.toThrow(
        ChallengeConflictError,
      );
      await expect(useCase.joinChallenge(userId, 'time-under-40')).rejects.toThrow(
        '동시에 최대 3개의 챌린지만 참여할 수 있습니다.',
      );
    });

    it('이미 참여 중인 챌린지면 ChallengeConflictError를 던진다', async () => {
      const template = makeTemplate();
      const existing = makeActiveChallenge();
      challengeRepo.findTemplateById.mockResolvedValue(template);
      challengeRepo.countActiveChallenges.mockResolvedValue(1);
      challengeRepo.findActiveByUserAndTemplate.mockResolvedValue(existing);

      await expect(useCase.joinChallenge(userId, 'time-under-40')).rejects.toThrow(
        ChallengeConflictError,
      );
      await expect(useCase.joinChallenge(userId, 'time-under-40')).rejects.toThrow(
        '이미 참여 중인 챌린지입니다.',
      );
    });
  });

  describe('abandonChallenge', () => {
    it('정상적으로 챌린지를 포기한다', async () => {
      const challenge = makeActiveChallenge();
      challengeRepo.findChallengeById.mockResolvedValue(challenge);

      await useCase.abandonChallenge(userId, 'challenge-1');

      expect(challengeRepo.saveChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'abandoned' }),
      );
    });

    it('존재하지 않는 챌린지면 에러를 던진다', async () => {
      challengeRepo.findChallengeById.mockResolvedValue(null);

      await expect(useCase.abandonChallenge(userId, 'non-existent')).rejects.toThrow(
        '챌린지를 찾을 수 없습니다.',
      );
    });

    it('다른 사용자의 챌린지를 포기하려 하면 에러를 던진다', async () => {
      const challenge = makeActiveChallenge({ userId: 'other-user' });
      challengeRepo.findChallengeById.mockResolvedValue(challenge);

      await expect(useCase.abandonChallenge(userId, 'challenge-1')).rejects.toThrow(
        '본인의 챌린지만 포기할 수 있습니다.',
      );
    });
  });

  describe('getActiveChallenges', () => {
    it('활성 챌린지 목록을 반환한다', async () => {
      const challenge = makeActiveChallenge({ currentProgress: 1 });
      const template = makeTemplate();

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findTemplateById.mockResolvedValue(template);

      const result = await useCase.getActiveChallenges(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('challenge-1');
      expect(result[0].template.id).toBe('time-under-40');
      expect(result[0].currentProgress).toBe(1);
      expect(result[0].targetProgress).toBe(3);
      expect(result[0].progressPercent).toBe(33);
    });

    it('만료된 챌린지는 자동으로 실패 처리하고 결과에서 제외한다', async () => {
      const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const expiredChallenge = makeActiveChallenge({
        deadlineAt: pastDeadline,
      });

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([expiredChallenge]);

      const result = await useCase.getActiveChallenges(userId);

      expect(result).toHaveLength(0);
      expect(challengeRepo.saveChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' }),
      );
    });

    it('활성 챌린지가 없으면 빈 배열을 반환한다', async () => {
      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([]);

      const result = await useCase.getActiveChallenges(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getTemplates', () => {
    it('템플릿 목록에 사용자의 참여/완료 상태를 포함한다', async () => {
      const template1 = makeTemplate({ id: 'time-under-40', badgeId: 'lightning' });
      const template2 = makeTemplate({
        id: 'streak-3d',
        badgeId: 'fire',
      });
      const template3 = makeTemplate({
        id: 'weekly-4',
        badgeId: 'calendar',
      });

      const activeChallenge = makeActiveChallenge({ templateId: 'time-under-40' });
      const badge = new UserBadge({
        userId,
        badgeId: 'fire',
        badgeName: '불꽃',
        badgeEmoji: '🔥',
        challengeId: 'old-challenge',
      });

      challengeRepo.findAllTemplates.mockResolvedValue([template1, template2, template3]);
      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([activeChallenge]);
      challengeRepo.findBadgesByUserId.mockResolvedValue([badge]);

      const result = await useCase.getTemplates(userId);

      expect(result).toHaveLength(3);

      // template1: 참여 중
      expect(result[0].template.id).toBe('time-under-40');
      expect(result[0].isJoined).toBe(true);
      expect(result[0].isCompleted).toBe(false);

      // template2: 완료됨 (뱃지 보유)
      expect(result[1].template.id).toBe('streak-3d');
      expect(result[1].isJoined).toBe(false);
      expect(result[1].isCompleted).toBe(true);

      // template3: 미참여
      expect(result[2].template.id).toBe('weekly-4');
      expect(result[2].isJoined).toBe(false);
      expect(result[2].isCompleted).toBe(false);
    });
  });

  describe('getChallengeHistory', () => {
    it('챌린지 히스토리와 통계를 반환한다', async () => {
      const completed = new UserChallenge({
        id: 'ch-1',
        userId,
        challengeTemplateId: 'time-under-40',
        status: 'completed',
        startedAt: new Date(),
        deadlineAt: new Date(),
        completedAt: new Date(),
        currentProgress: 3,
        targetProgress: 3,
      });
      const failed = new UserChallenge({
        id: 'ch-2',
        userId,
        challengeTemplateId: 'streak-3d',
        status: 'failed',
        startedAt: new Date(),
        deadlineAt: new Date(),
        completedAt: null,
        currentProgress: 1,
        targetProgress: 3,
      });
      const template1 = makeTemplate({ id: 'time-under-40' });
      const template2 = makeTemplate({ id: 'streak-3d' });

      challengeRepo.findChallengeHistory.mockResolvedValue({
        challenges: [completed, failed],
        totalCount: 2,
      });
      challengeRepo.findTemplateById.mockImplementation(async (id) => {
        if (id === 'time-under-40') return template1;
        if (id === 'streak-3d') return template2;
        return null;
      });

      const result = await useCase.getChallengeHistory(userId, 10, 0);

      expect(result.challenges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.stats.totalCompleted).toBe(1);
      expect(result.stats.totalFailed).toBe(1);
      expect(result.stats.totalAbandoned).toBe(0);
      expect(result.stats.completionRate).toBe(50);
    });

    it('히스토리가 없으면 빈 결과를 반환한다', async () => {
      challengeRepo.findChallengeHistory.mockResolvedValue({
        challenges: [],
        totalCount: 0,
      });

      const result = await useCase.getChallengeHistory(userId, 10, 0);

      expect(result.challenges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.stats.completionRate).toBe(0);
    });
  });

  describe('getBadges', () => {
    it('사용자의 뱃지 컬렉션을 반환한다', async () => {
      const badge = new UserBadge({
        userId,
        badgeId: 'lightning',
        badgeName: '번개',
        badgeEmoji: '⚡',
        challengeId: 'ch-1',
      });

      challengeRepo.findBadgesByUserId.mockResolvedValue([badge]);
      challengeRepo.countTotalBadges.mockResolvedValue(6);

      const result = await useCase.getBadges(userId);

      expect(result.badges).toHaveLength(1);
      expect(result.earnedCount).toBe(1);
      expect(result.totalBadges).toBe(6);
    });

    it('뱃지가 없으면 빈 결과를 반환한다', async () => {
      challengeRepo.findBadgesByUserId.mockResolvedValue([]);
      challengeRepo.countTotalBadges.mockResolvedValue(6);

      const result = await useCase.getBadges(userId);

      expect(result.badges).toHaveLength(0);
      expect(result.earnedCount).toBe(0);
      expect(result.totalBadges).toBe(6);
    });
  });
});
