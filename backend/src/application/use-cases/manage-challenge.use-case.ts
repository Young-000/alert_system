import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ChallengeRepository,
  TemplateMap,
} from '@domain/repositories/challenge.repository';
import { ChallengeTemplate } from '@domain/entities/challenge-template.entity';
import { UserChallenge } from '@domain/entities/user-challenge.entity';
import {
  MAX_ACTIVE_CHALLENGES,
  TemplateWithStatus,
  ActiveChallengeDetail,
  ChallengeHistoryResult,
  BadgeCollectionResult,
} from '@application/dto/challenge.dto';

@Injectable()
export class ManageChallengeUseCase {
  constructor(
    @Inject('CHALLENGE_REPOSITORY')
    private readonly challengeRepo: ChallengeRepository,
  ) {}

  async getTemplates(userId: string): Promise<TemplateWithStatus[]> {
    const templates = await this.challengeRepo.findAllTemplates();
    const activeChallenges = await this.expireDueChallenges(userId, new Date());
    const badges = await this.challengeRepo.findBadgesByUserId(userId);

    const activeTemplateIds = new Set(
      activeChallenges.map((c) => c.challengeTemplateId),
    );
    const completedBadgeIds = new Set(badges.map((b) => b.badgeId));

    return templates.map((template) => ({
      template,
      isJoined: activeTemplateIds.has(template.id),
      isCompleted: completedBadgeIds.has(template.badgeId),
    }));
  }

  async joinChallenge(
    userId: string,
    templateId: string,
  ): Promise<UserChallenge> {
    // 목록(`findAllTemplates`)은 isActive=true 만 내보낸다. 참여도 같은 기준으로
    // 막아야 한다 — 아니면 내려간 챌린지가 목록에 없는 채로 정원 한 칸을 계속
    // 차지한다. 내려간 템플릿을 '없음'과 같은 404로 답하는 것은 의도적이다.
    const template = await this.challengeRepo.findTemplateById(templateId);
    if (!template || !template.isActive) {
      throw new NotFoundException('챌린지 템플릿을 찾을 수 없습니다.');
    }

    // 정원과 중복은 '지금 살아 있는' 도전만 기준이어야 한다. 마감이 지난 행은
    // DB에 아직 status='active'로 남아 있으므로, 세기 전에 실패로 기록한다.
    // 건너뛰기만 하면 부분 유니크 인덱스
    // (user_challenges_user_template_active_unique, status='active')에 걸려
    // 23505가 그대로 500으로 나간다.
    await this.expireDueChallenges(userId, new Date());

    const activeCount = await this.challengeRepo.countActiveChallenges(userId);
    if (activeCount >= MAX_ACTIVE_CHALLENGES) {
      throw new ChallengeConflictError(
        `동시에 최대 ${MAX_ACTIVE_CHALLENGES}개의 챌린지만 참여할 수 있습니다.`,
      );
    }

    const existing = await this.challengeRepo.findActiveByUserAndTemplate(
      userId,
      templateId,
    );
    if (existing) {
      throw new ChallengeConflictError(
        '이미 참여 중인 챌린지입니다.',
      );
    }

    const challenge = UserChallenge.create(
      userId,
      templateId,
      template.targetValue,
      template.durationDays,
    );

    return this.challengeRepo.saveChallenge(challenge);
  }

  async abandonChallenge(
    userId: string,
    challengeId: string,
  ): Promise<void> {
    const challenge = await this.challengeRepo.findChallengeById(challengeId);
    if (!challenge) {
      throw new NotFoundException('챌린지를 찾을 수 없습니다.');
    }

    if (challenge.userId !== userId) {
      throw new ForbiddenException('본인의 챌린지만 포기할 수 있습니다.');
    }

    // 엔티티의 abandon()도 같은 조건을 막지만 그쪽은 bare Error라 500이 된다.
    // 목록을 그린 뒤 마감이 지나거나 다른 기기에서 이미 포기한 도전을 탭하는 경로가
    // 실제로 있으므로, 사용자가 읽을 수 있는 409로 여기서 끊는다.
    if (challenge.status !== 'active') {
      throw new ConflictException('이미 끝난 도전이에요.');
    }

    const abandoned = challenge.abandon();
    await this.challengeRepo.saveChallenge(abandoned);
  }

  async getActiveChallenges(userId: string): Promise<ActiveChallengeDetail[]> {
    const stillActive = await this.expireDueChallenges(userId, new Date());
    const details: ActiveChallengeDetail[] = [];

    // Batch fetch all templates (N+1 → 1 query)
    const templateMap = await this.loadTemplateMap(stillActive);

    for (const challenge of stillActive) {
      const template = templateMap.get(challenge.challengeTemplateId);
      if (!template) continue;

      details.push(this.toDetail(challenge, template));
    }

    return details;
  }

  /**
   * 마감이 지난 도전을 실패로 기록하고, 아직 살아 있는 도전만 돌려준다.
   *
   * 만료는 도메인 규칙(`UserChallenge.checkExpiry`)이고, 이 프로젝트에는
   * 만료를 돌리는 배치가 없다 — 읽을 때 처리한다. 그래서 **활성 도전을 읽는
   * 모든 경로가 같은 함수를 타야 한다.** 한 경로만 적용하면 같은 화면에서
   * 답이 갈린다 (진행 중 목록은 비었는데 템플릿 카드는 "진행 중"으로 잠김).
   */
  private async expireDueChallenges(
    userId: string,
    now: Date,
  ): Promise<UserChallenge[]> {
    const challenges =
      await this.challengeRepo.findActiveChallengesByUserId(userId);

    const stillActive: UserChallenge[] = [];
    for (const challenge of challenges) {
      const checked = challenge.checkExpiry(now);
      if (checked.status === 'failed') {
        await this.challengeRepo.saveChallenge(checked);
        continue;
      }
      stillActive.push(checked);
    }

    return stillActive;
  }

  async getChallengeHistory(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ChallengeHistoryResult> {
    const { challenges, totalCount } =
      await this.challengeRepo.findChallengeHistory(userId, limit, offset);

    const details: ActiveChallengeDetail[] = [];
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalAbandoned = 0;

    // Batch fetch all templates (N+1 → 1 query)
    const templateMap = await this.loadTemplateMap(challenges);
    const now = new Date();

    for (const challenge of challenges) {
      const template = templateMap.get(challenge.challengeTemplateId);
      if (!template) continue;

      // 히스토리는 마감이 지난 도전을 '진행 중'으로 보여주면 안 된다. 기록은
      // 활성 목록 경로가 맡으므로 여기서는 표시만 도메인 규칙에 맞춘다
      // (페이지 단위 읽기에 쓰기를 섞지 않는다).
      const checked = challenge.checkExpiry(now);

      details.push(this.toDetail(checked, template));

      if (checked.status === 'completed') totalCompleted++;
      if (checked.status === 'failed') totalFailed++;
      if (checked.status === 'abandoned') totalAbandoned++;
    }

    const totalFinished = totalCompleted + totalFailed + totalAbandoned;
    const completionRate =
      totalFinished > 0
        ? Math.round((totalCompleted / totalFinished) * 100)
        : 0;

    return {
      challenges: details,
      totalCount,
      stats: {
        totalCompleted,
        totalFailed,
        totalAbandoned,
        completionRate,
      },
    };
  }

  private toDetail(
    challenge: UserChallenge,
    template: ChallengeTemplate,
  ): ActiveChallengeDetail {
    return {
      id: challenge.id,
      template,
      status: challenge.status,
      startedAt: challenge.startedAt,
      deadlineAt: challenge.deadlineAt,
      currentProgress: challenge.currentProgress,
      targetProgress: challenge.targetProgress,
      progressPercent: challenge.progressPercent,
      daysRemaining: challenge.daysRemaining,
      isCloseToCompletion: challenge.isCloseToCompletion,
    };
  }

  private async loadTemplateMap(
    challenges: readonly UserChallenge[],
  ): Promise<TemplateMap> {
    const templateIds = [
      ...new Set(challenges.map((c) => c.challengeTemplateId)),
    ];
    const templates = await this.challengeRepo.findTemplatesByIds(templateIds);
    return new Map(templates.map((t) => [t.id, t]));
  }

  async getBadges(userId: string): Promise<BadgeCollectionResult> {
    const badges = await this.challengeRepo.findBadgesByUserId(userId);
    const totalBadges = await this.challengeRepo.countTotalBadges();

    return {
      badges,
      totalBadges,
      earnedCount: badges.length,
    };
  }
}

export class ChallengeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChallengeConflictError';
  }
}
