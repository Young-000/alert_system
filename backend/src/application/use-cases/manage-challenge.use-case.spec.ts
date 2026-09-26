import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ManageChallengeUseCase,
  ChallengeConflictError,
} from './manage-challenge.use-case';
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
    const deadline =
      overrides.deadlineAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
      findTemplatesByIds: jest.fn().mockResolvedValue([]),
      // 실제 리포지토리는 언제나 배열을 준다. 기본값을 두지 않으면 만료 스윕이
      // undefined 를 순회해 '계약 위반'이 아니라 픽스처 결함으로 터진다.
      findActiveChallengesByUserId: jest.fn().mockResolvedValue([]),
      findChallengeById: jest.fn(),
      findActiveByUserAndTemplate: jest.fn(),
      countActiveChallenges: jest.fn(),
      findChallengeHistory: jest.fn(),
      saveChallenge: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      findBadgesByUserId: jest.fn(),
      findBadgeByUserAndBadgeId: jest.fn(),
      saveBadge: jest.fn().mockImplementation((b) => Promise.resolve(b)),
      countTotalBadges: jest.fn(),
      findTemplatesByIds: jest.fn(),
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

    // 목록(`findAllTemplates`)은 isActive=true 만 내보낸다. 참여도 같은 기준이어야
    // 한다 — 아니면 내려간 챌린지가 목록에 없는 채로 정원 한 칸을 계속 차지한다.
    // '없음'과 같은 404로 답하는 것은 의도적이다. 따로 구분해 주면 내려간
    // 챌린지가 존재한다는 사실 자체가 새어 나간다.
    it('내려간(비활성) 템플릿이면 참여할 수 없다', async () => {
      challengeRepo.findTemplateById.mockResolvedValue(
        makeTemplate({ isActive: false }),
      );
      challengeRepo.countActiveChallenges.mockResolvedValue(0);
      challengeRepo.findActiveByUserAndTemplate.mockResolvedValue(null);

      await expect(
        useCase.joinChallenge(userId, 'time-under-40'),
      ).rejects.toThrow(NotFoundException);
      expect(challengeRepo.saveChallenge).not.toHaveBeenCalled();
    });

    it('활성 템플릿은 그대로 참여된다', async () => {
      challengeRepo.findTemplateById.mockResolvedValue(
        makeTemplate({ isActive: true }),
      );
      challengeRepo.countActiveChallenges.mockResolvedValue(0);
      challengeRepo.findActiveByUserAndTemplate.mockResolvedValue(null);

      await expect(
        useCase.joinChallenge(userId, 'time-under-40'),
      ).resolves.toBeDefined();
    });

    it('존재하지 않는 템플릿이면 404 NotFoundException을 던진다', async () => {
      challengeRepo.findTemplateById.mockResolvedValue(null);

      // 타입까지 봐야 한다 — bare Error면 AllExceptionsFilter가 500 +
      // 'Internal server error'로 바꿔 아래 문구를 지운다.
      await expect(
        useCase.joinChallenge(userId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.joinChallenge(userId, 'non-existent'),
      ).rejects.toThrow('챌린지 템플릿을 찾을 수 없습니다.');
    });

    it('활성 챌린지가 3개면 ChallengeConflictError를 던진다', async () => {
      const template = makeTemplate();
      challengeRepo.findTemplateById.mockResolvedValue(template);
      challengeRepo.countActiveChallenges.mockResolvedValue(3);

      await expect(
        useCase.joinChallenge(userId, 'time-under-40'),
      ).rejects.toThrow(ChallengeConflictError);
      await expect(
        useCase.joinChallenge(userId, 'time-under-40'),
      ).rejects.toThrow('동시에 최대 3개의 챌린지만 참여할 수 있습니다.');
    });

    it('이미 참여 중인 챌린지면 ChallengeConflictError를 던진다', async () => {
      const template = makeTemplate();
      const existing = makeActiveChallenge();
      challengeRepo.findTemplateById.mockResolvedValue(template);
      challengeRepo.countActiveChallenges.mockResolvedValue(1);
      challengeRepo.findActiveByUserAndTemplate.mockResolvedValue(existing);

      await expect(
        useCase.joinChallenge(userId, 'time-under-40'),
      ).rejects.toThrow(ChallengeConflictError);
      await expect(
        useCase.joinChallenge(userId, 'time-under-40'),
      ).rejects.toThrow('이미 참여 중인 챌린지입니다.');
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

    it('존재하지 않는 챌린지면 404 NotFoundException을 던진다', async () => {
      challengeRepo.findChallengeById.mockResolvedValue(null);

      await expect(
        useCase.abandonChallenge(userId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.abandonChallenge(userId, 'non-existent'),
      ).rejects.toThrow('챌린지를 찾을 수 없습니다.');
    });

    it('다른 사용자의 챌린지를 포기하려 하면 403 ForbiddenException을 던진다', async () => {
      const challenge = makeActiveChallenge({ userId: 'other-user' });
      challengeRepo.findChallengeById.mockResolvedValue(challenge);

      await expect(
        useCase.abandonChallenge(userId, 'challenge-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.abandonChallenge(userId, 'challenge-1'),
      ).rejects.toThrow('본인의 챌린지만 포기할 수 있습니다.');
    });

    // 목록을 그린 뒤 마감이 지나거나 다른 기기에서 이미 포기한 도전을 탭하면 여기에 온다.
    // 엔티티의 `Cannot abandon ${status} challenge`가 그대로 새면 500이 나가고,
    // 모바일은 낙관적 삭제를 되돌린 뒤 "도전 포기에 실패했습니다"만 띄운다.
    it('이미 끝난 챌린지를 포기하면 409 ConflictException을 던진다', async () => {
      const challenge = makeActiveChallenge({ status: 'completed' });
      challengeRepo.findChallengeById.mockResolvedValue(challenge);

      await expect(
        useCase.abandonChallenge(userId, 'challenge-1'),
      ).rejects.toThrow(ConflictException);
      expect(challengeRepo.saveChallenge).not.toHaveBeenCalled();
    });
  });

  describe('getActiveChallenges', () => {
    it('활성 챌린지 목록을 반환한다', async () => {
      const challenge = makeActiveChallenge({ currentProgress: 1 });
      const template = makeTemplate();

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([challenge]);
      challengeRepo.findTemplatesByIds.mockResolvedValue([template]);

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

      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([
        expiredChallenge,
      ]);

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

      challengeRepo.findAllTemplates.mockResolvedValue([
        template1,
        template2,
        template3,
      ]);
      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([
        activeChallenge,
      ]);
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

  /**
   * 마감이 지난 도전은 도메인 규칙상 이미 '실패'다(`UserChallenge.checkExpiry`).
   * 그 규칙을 `getActiveChallenges`만 적용하고 나머지 읽기 경로가 적용하지 않으면
   * **같은 화면 안에서 답이 갈린다** — 진행 중 목록은 비어 있는데 템플릿 카드는
   * "진행 중"으로 잠겨 있고, 다시 참여하려 하면 409가 난다.
   *
   * 모바일 도전 화면은 두 조회를 `Promise.all`로 **동시에** 쏜다
   * (`mobile/src/hooks/useChallenges.ts:78`). 활성 목록이 만료를 기록하기 전에
   * 템플릿 조회가 옛 상태를 읽으므로, 순서에 기대면 안 된다.
   */
  describe('만료된 도전의 처리 (읽기 경로 전체)', () => {
    const pastDeadline = (): Date => new Date(Date.now() - 24 * 60 * 60 * 1000);

    it('getTemplates: 마감이 지난 도전은 isJoined 로 세지 않는다', async () => {
      const template = makeTemplate({ id: 'time-under-40' });
      const expired = makeActiveChallenge({
        templateId: 'time-under-40',
        deadlineAt: pastDeadline(),
      });

      challengeRepo.findAllTemplates.mockResolvedValue([template]);
      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([expired]);
      challengeRepo.findBadgesByUserId.mockResolvedValue([]);

      const result = await useCase.getTemplates(userId);

      // 화면은 isJoined 로 '도전 시작' 버튼을 잠근다 (app/challenges.tsx:119).
      expect(result[0].isJoined).toBe(false);
    });

    it('getTemplates: 마감이 지난 도전을 실패로 기록한다', async () => {
      const template = makeTemplate({ id: 'time-under-40' });
      const expired = makeActiveChallenge({
        templateId: 'time-under-40',
        deadlineAt: pastDeadline(),
      });

      challengeRepo.findAllTemplates.mockResolvedValue([template]);
      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([expired]);
      challengeRepo.findBadgesByUserId.mockResolvedValue([]);

      await useCase.getTemplates(userId);

      expect(challengeRepo.saveChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'challenge-1', status: 'failed' }),
      );
    });

    it('joinChallenge: 마감이 지난 도전은 정원(3)에 세지 않는다', async () => {
      const template = makeTemplate({ id: 'streak-3d' });
      const expired = [1, 2, 3].map((n) =>
        makeActiveChallenge({
          id: `expired-${n}`,
          templateId: `old-${n}`,
          deadlineAt: pastDeadline(),
        }),
      );

      challengeRepo.findTemplateById.mockResolvedValue(template);
      challengeRepo.findActiveChallengesByUserId.mockResolvedValue(expired);
      // 만료 처리가 끝난 뒤의 실제 DB 상태 — 세 건 모두 'failed' 가 되어 0건이다.
      challengeRepo.countActiveChallenges.mockResolvedValue(0);
      challengeRepo.findActiveByUserAndTemplate.mockResolvedValue(null);

      const result = await useCase.joinChallenge(userId, 'streak-3d');

      expect(result.challengeTemplateId).toBe('streak-3d');
      // 세는 쪽이 아니라 '세기 전에 만료를 기록했는가'가 계약이다.
      expect(challengeRepo.saveChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'expired-1', status: 'failed' }),
      );
      expect(challengeRepo.saveChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'expired-3', status: 'failed' }),
      );
    });

    it('joinChallenge: 같은 템플릿의 마감 지난 도전을 정리한 뒤 다시 참여시킨다', async () => {
      const template = makeTemplate({ id: 'time-under-40' });
      const expired = makeActiveChallenge({
        id: 'expired-same',
        templateId: 'time-under-40',
        deadlineAt: pastDeadline(),
      });

      challengeRepo.findTemplateById.mockResolvedValue(template);
      challengeRepo.findActiveChallengesByUserId.mockResolvedValue([expired]);
      challengeRepo.countActiveChallenges.mockResolvedValue(0);
      // 만료 기록 후에는 status='active' 부분 유니크 인덱스에 걸리는 행이 없다.
      challengeRepo.findActiveByUserAndTemplate.mockResolvedValue(null);

      const result = await useCase.joinChallenge(userId, 'time-under-40');

      expect(result.status).toBe('active');
      expect(challengeRepo.saveChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'expired-same', status: 'failed' }),
      );
    });

    it('getChallengeHistory: 마감이 지난 도전을 실패로 표시하고 통계에 센다', async () => {
      const template = makeTemplate({ id: 'time-under-40' });
      const expired = makeActiveChallenge({
        id: 'ch-expired',
        templateId: 'time-under-40',
        deadlineAt: pastDeadline(),
      });

      challengeRepo.findChallengeHistory.mockResolvedValue({
        challenges: [expired],
        totalCount: 1,
      });
      challengeRepo.findTemplatesByIds.mockResolvedValue([template]);

      const result = await useCase.getChallengeHistory(userId, 20, 0);

      expect(result.challenges[0].status).toBe('failed');
      expect(result.stats.totalFailed).toBe(1);
      // 끝난 도전이 분모에 들어가야 완료율이 맞는다.
      expect(result.stats.completionRate).toBe(0);
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
      challengeRepo.findTemplatesByIds.mockResolvedValue([
        template1,
        template2,
      ]);

      const result = await useCase.getChallengeHistory(userId, 10, 0);

      expect(result.challenges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.stats.totalCompleted).toBe(1);
      expect(result.stats.totalFailed).toBe(1);
      expect(result.stats.totalAbandoned).toBe(0);
      expect(result.stats.completionRate).toBe(50);
    });

    it('템플릿을 챌린지 수와 무관하게 한 번만 조회한다 (N+1 방지)', async () => {
      const template = makeTemplate({ id: 'time-under-40' });
      const makeFinished = (id: string) =>
        new UserChallenge({
          id,
          userId,
          challengeTemplateId: 'time-under-40',
          status: 'completed',
          startedAt: new Date(),
          deadlineAt: new Date(),
          completedAt: new Date(),
          currentProgress: 3,
          targetProgress: 3,
        });

      challengeRepo.findChallengeHistory.mockResolvedValue({
        challenges: [makeFinished('ch-1'), makeFinished('ch-2'), makeFinished('ch-3')],
        totalCount: 3,
      });
      challengeRepo.findTemplatesByIds.mockResolvedValue([template]);

      const result = await useCase.getChallengeHistory(userId, 10, 0);

      expect(result.challenges).toHaveLength(3);
      expect(challengeRepo.findTemplatesByIds).toHaveBeenCalledTimes(1);
      // 같은 템플릿 3건 → 중복 제거된 id 1개만 조회
      expect(challengeRepo.findTemplatesByIds).toHaveBeenCalledWith([
        'time-under-40',
      ]);
      expect(challengeRepo.findTemplateById).not.toHaveBeenCalled();
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
