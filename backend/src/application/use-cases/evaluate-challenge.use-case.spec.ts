import { EvaluateChallengeUseCase } from './evaluate-challenge.use-case';
import { ChallengeRepository } from '@domain/repositories/challenge.repository';
import { ChallengeTemplate } from '@domain/entities/challenge-template.entity';
import { UserChallenge } from '@domain/entities/user-challenge.entity';
import { SessionCompletionData } from '@application/dto/challenge.dto';

describe('EvaluateChallengeUseCase', () => {
  let useCase: EvaluateChallengeUseCase;
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
      templateId: string;
      currentProgress: number;
      targetProgress: number;
    }> = {},
  ): UserChallenge => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    return new UserChallenge({
      id: overrides.id ?? 'challenge-1',
      userId,
      challengeTemplateId: overrides.templateId ?? 'time-under-40',
      status: 'active',
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
    useCase = new EvaluateChallengeUseCase(challengeRepo);
  });

  it('활성 챌린지가 없으면 빈 배열을 반환한다', async () => {
    challengeRepo.findActiveChallengesByUserId.mockResolvedValue([]);

    const result = await useCase.execute(userId, { totalDurationMinutes: 30 });

    expect(result).toEqual([]);
  });

  describe('duration_under 조건 평가', () => {
    it('출퇴근 시간이 조건 값 미만이면 진행도를 증가시킨다', async () => {
      const challenge = makeActiveChallenge({ currentProgress: 1 });
      const template = makeTemplate();

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);

      const data: SessionCompletionData = { totalDurationMinutes: 35 };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(1);
      expect(result[0].previousProgress).toBe(1);
      expect(result[0].currentProgress).toBe(2);
      expect(result[0].isCompleted).toBe(false);
      expect(challengeRepo.saveChallenge).toHaveBeenCalled();
    });

    it('출퇴근 시간이 조건 값 이상이면 진행도를 증가시키지 않는다', async () => {
      const challenge = makeActiveChallenge();
      const template = makeTemplate();

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);

      const data: SessionCompletionData = { totalDurationMinutes: 45 };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(0);
    });

    it('totalDurationMinutes가 undefined이면 진행도를 증가시키지 않는다', async () => {
      const challenge = makeActiveChallenge();
      const template = makeTemplate();

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);

      const data: SessionCompletionData = { currentStreak: 3 };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(0);
    });
  });

  describe('consecutive_days 조건 평가', () => {
    it('연속 출퇴근 일수가 조건 값 이상이면 진행도를 증가시킨다', async () => {
      const template = makeTemplate({
        id: 'streak-3d',
        conditionType: 'consecutive_days',
        conditionValue: 3,
      });
      const challenge = makeActiveChallenge({ templateId: 'streak-3d' });

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);

      const data: SessionCompletionData = { currentStreak: 3 };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(1);
      expect(result[0].currentProgress).toBe(1);
    });

    it('연속 출퇴근 일수가 조건 값 미만이면 진행도를 증가시키지 않는다', async () => {
      const template = makeTemplate({
        id: 'streak-3d',
        conditionType: 'consecutive_days',
        conditionValue: 3,
      });
      const challenge = makeActiveChallenge({ templateId: 'streak-3d' });

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);

      const data: SessionCompletionData = { currentStreak: 2 };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(0);
    });
  });

  describe('weekly_count 조건 평가', () => {
    it('주간 세션 수가 조건 값 이상이면 진행도를 증가시킨다', async () => {
      const template = makeTemplate({
        id: 'weekly-4',
        conditionType: 'weekly_count',
        conditionValue: 4,
      });
      const challenge = makeActiveChallenge({ templateId: 'weekly-4' });

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);

      const data: SessionCompletionData = { weeklySessionCount: 4 };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(1);
      expect(result[0].currentProgress).toBe(1);
    });
  });

  describe('weekday_complete 조건 평가', () => {
    it('평일 세션 요일 수가 조건 값 이상이면 진행도를 증가시킨다', async () => {
      const template = makeTemplate({
        id: 'weekly-perfect',
        conditionType: 'weekday_complete',
        conditionValue: 5,
      });
      const challenge = makeActiveChallenge({ templateId: 'weekly-perfect' });

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);

      const data: SessionCompletionData = {
        weekdaySessionsThisWeek: [1, 2, 3, 4, 5],
      };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(1);
      expect(result[0].currentProgress).toBe(1);
    });

    it('평일 세션 요일 수가 부족하면 진행도를 증가시키지 않는다', async () => {
      const template = makeTemplate({
        id: 'weekly-perfect',
        conditionType: 'weekday_complete',
        conditionValue: 5,
      });
      const challenge = makeActiveChallenge({ templateId: 'weekly-perfect' });

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);

      const data: SessionCompletionData = {
        weekdaySessionsThisWeek: [1, 2, 3],
      };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(0);
    });
  });

  describe('만료된 챌린지 처리', () => {
    it('기한이 지난 챌린지는 자동으로 실패 처리한다', async () => {
      const pastDeadline = new Date();
      pastDeadline.setDate(pastDeadline.getDate() - 1);
      const challenge = new UserChallenge({
        id: 'challenge-expired',
        userId,
        challengeTemplateId: 'time-under-40',
        status: 'active',
        startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        deadlineAt: pastDeadline,
        completedAt: null,
        currentProgress: 1,
        targetProgress: 3,
      });

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([makeTemplate()]);

      const result = await useCase.execute(userId, {
        totalDurationMinutes: 30,
      });

      expect(result).toHaveLength(0);
      expect(challengeRepo.saveChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' }),
      );
    });
  });

  describe('챌린지 완료 시 뱃지 수여', () => {
    it('챌린지 완료 시 뱃지를 생성한다', async () => {
      const challenge = makeActiveChallenge({
        currentProgress: 2,
        targetProgress: 3,
      });
      const template = makeTemplate();

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);
      challengeRepo.findBadgeByUserAndBadgeId.mockResolvedValue(null);

      const data: SessionCompletionData = { totalDurationMinutes: 35 };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(1);
      expect(result[0].isCompleted).toBe(true);
      expect(result[0].badgeEarned).not.toBeNull();
      expect(result[0].badgeEarned?.badgeId).toBe('lightning');
      expect(result[0].badgeEarned?.badgeName).toBe('번개');
      expect(result[0].badgeEarned?.badgeEmoji).toBe('⚡');
      expect(challengeRepo.saveBadge).toHaveBeenCalled();
    });

    it('이미 뱃지가 있으면 중복 생성하지 않는다', async () => {
      const challenge = makeActiveChallenge({
        currentProgress: 2,
        targetProgress: 3,
      });
      const template = makeTemplate();

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findAllTemplates.mockResolvedValue([template]);
      challengeRepo.findBadgeByUserAndBadgeId.mockResolvedValue({
        id: 'existing-badge',
        userId,
        badgeId: 'lightning',
        badgeName: '번개',
        badgeEmoji: '⚡',
        challengeId: 'old-challenge',
        earnedAt: new Date(),
        createdAt: new Date(),
      } as any);

      const data: SessionCompletionData = { totalDurationMinutes: 35 };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(1);
      expect(result[0].isCompleted).toBe(true);
      expect(result[0].badgeEarned).toBeNull();
      expect(challengeRepo.saveBadge).not.toHaveBeenCalled();
    });
  });

  describe('여러 챌린지 동시 평가', () => {
    it('여러 활성 챌린지를 한 번에 평가한다', async () => {
      const timeChallenge = makeActiveChallenge({
        id: 'ch-1',
        templateId: 'time-under-40',
        currentProgress: 0,
      });
      const streakChallenge = makeActiveChallenge({
        id: 'ch-2',
        templateId: 'streak-3d',
        currentProgress: 0,
      });

      const timeTemplate = makeTemplate();
      const streakTemplate = makeTemplate({
        id: 'streak-3d',
        conditionType: 'consecutive_days',
        conditionValue: 3,
        name: '3일 연속 출퇴근',
        badgeId: 'fire',
      });

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([
        timeChallenge,
        streakChallenge,
      ]);
      challengeRepo.findAllTemplates.mockResolvedValue([timeTemplate, streakTemplate]);

      const data: SessionCompletionData = {
        totalDurationMinutes: 30,
        currentStreak: 3,
      };
      const result = await useCase.execute(userId, data);

      expect(result).toHaveLength(2);
      expect(result[0].challengeId).toBe('ch-1');
      expect(result[1].challengeId).toBe('ch-2');
    });
  });

  it('템플릿을 찾을 수 없으면 해당 챌린지를 건너뛴다', async () => {
    const challenge = makeActiveChallenge();

    challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
    challengeRepo.findAllTemplates.mockResolvedValue([]);

    const data: SessionCompletionData = { totalDurationMinutes: 30 };
    const result = await useCase.execute(userId, data);

    expect(result).toHaveLength(0);
  });

  it('완료에 가까운 챌린지는 isCloseToCompletion이 true이다', async () => {
    const challenge = makeActiveChallenge({
      currentProgress: 1,
      targetProgress: 3,
    });
    const template = makeTemplate();

    challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
    challengeRepo.findAllTemplates.mockResolvedValue([template]);

    const data: SessionCompletionData = { totalDurationMinutes: 35 };
    const result = await useCase.execute(userId, data);

    expect(result).toHaveLength(1);
    // currentProgress becomes 2, targetProgress is 3 → 3-2=1 → isCloseToCompletion = true
    expect(result[0].isCloseToCompletion).toBe(true);
  });
});
