import { UserChallenge } from './user-challenge.entity';

describe('UserChallenge', () => {
  describe('create', () => {
    it('활성 도전을 생성하면 status가 active이다', () => {
      const challenge = UserChallenge.create('user-1', 'time-under-40', 3, 14);

      expect(challenge.userId).toBe('user-1');
      expect(challenge.challengeTemplateId).toBe('time-under-40');
      expect(challenge.status).toBe('active');
      expect(challenge.currentProgress).toBe(0);
      expect(challenge.targetProgress).toBe(3);
      expect(challenge.completedAt).toBeNull();
      expect(challenge.id).toBeDefined();
      expect(challenge.startedAt).toBeInstanceOf(Date);
      expect(challenge.createdAt).toBeInstanceOf(Date);
      expect(challenge.updatedAt).toBeInstanceOf(Date);
    });

    it('durationDays만큼 마감일이 설정된다', () => {
      const before = new Date();
      const challenge = UserChallenge.create('user-1', 'template-1', 5, 7);
      const after = new Date();

      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + 7);
      const expectedMax = new Date(after);
      expectedMax.setDate(expectedMax.getDate() + 7);

      expect(challenge.deadlineAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(challenge.deadlineAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });

    it('userId가 빈 문자열이면 에러를 던진다', () => {
      expect(() =>
        UserChallenge.create('', 'template-1', 3, 14),
      ).toThrow('userId is required');
    });

    it('templateId가 빈 문자열이면 에러를 던진다', () => {
      expect(() =>
        UserChallenge.create('user-1', '', 3, 14),
      ).toThrow('templateId is required');
    });

    it('targetProgress가 0이면 에러를 던진다', () => {
      expect(() =>
        UserChallenge.create('user-1', 'template-1', 0, 14),
      ).toThrow('targetProgress must be greater than 0');
    });

    it('durationDays가 0이면 에러를 던진다', () => {
      expect(() =>
        UserChallenge.create('user-1', 'template-1', 3, 0),
      ).toThrow('durationDays must be greater than 0');
    });
  });

  describe('incrementProgress', () => {
    it('진행률을 증가시키면 currentProgress가 1 증가한다', () => {
      const challenge = UserChallenge.create('user-1', 'template-1', 3, 14);
      const updated = challenge.incrementProgress();

      expect(updated.currentProgress).toBe(1);
      expect(updated.status).toBe('active');
      expect(updated.completedAt).toBeNull();
    });

    it('목표에 도달하면 status가 completed로 변경된다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 2,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
      });

      const completed = challenge.incrementProgress();

      expect(completed.currentProgress).toBe(3);
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeInstanceOf(Date);
    });

    it('목표를 초과해도 completed 상태가 된다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 4,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
      });

      const completed = challenge.incrementProgress();

      expect(completed.status).toBe('completed');
    });

    it('active가 아닌 도전의 진행률을 증가시키면 에러를 던진다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 0,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'completed',
      });

      expect(() => challenge.incrementProgress()).toThrow(
        'Cannot increment progress on completed challenge',
      );
    });

    it('원본 인스턴스는 변경되지 않는다 (불변성)', () => {
      const challenge = UserChallenge.create('user-1', 'template-1', 3, 14);
      challenge.incrementProgress();

      expect(challenge.currentProgress).toBe(0);
      expect(challenge.status).toBe('active');
    });
  });

  describe('abandon', () => {
    it('도전을 포기하면 status가 abandoned로 변경된다', () => {
      const challenge = UserChallenge.create('user-1', 'template-1', 3, 14);
      const abandoned = challenge.abandon();

      expect(abandoned.status).toBe('abandoned');
      expect(abandoned.completedAt).toBeNull();
      expect(abandoned.id).toBe(challenge.id);
      expect(abandoned.currentProgress).toBe(challenge.currentProgress);
    });

    it('active가 아닌 도전을 포기하면 에러를 던진다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 3,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'completed',
      });

      expect(() => challenge.abandon()).toThrow(
        'Cannot abandon completed challenge',
      );
    });

    it('원본 인스턴스는 변경되지 않는다 (불변성)', () => {
      const challenge = UserChallenge.create('user-1', 'template-1', 3, 14);
      challenge.abandon();

      expect(challenge.status).toBe('active');
    });
  });

  describe('checkExpiry', () => {
    it('마감일이 지나면 status가 failed로 변경된다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 1,
        targetProgress: 3,
        deadlineAt: new Date('2026-01-01T00:00:00Z'),
        status: 'active',
      });

      const expired = challenge.checkExpiry(new Date('2026-01-02T00:00:00Z'));

      expect(expired.status).toBe('failed');
      expect(expired.completedAt).toBeNull();
    });

    it('마감일이 지나지 않았으면 상태가 변경되지 않는다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 1,
        targetProgress: 3,
        deadlineAt: new Date('2026-12-31T00:00:00Z'),
        status: 'active',
      });

      const same = challenge.checkExpiry(new Date('2026-06-01T00:00:00Z'));

      expect(same.status).toBe('active');
      expect(same).toBe(challenge); // 같은 인스턴스 반환
    });

    it('active가 아닌 도전은 만료 체크를 하지 않는다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 3,
        targetProgress: 3,
        deadlineAt: new Date('2026-01-01T00:00:00Z'),
        status: 'completed',
      });

      const same = challenge.checkExpiry(new Date('2026-06-01T00:00:00Z'));

      expect(same.status).toBe('completed');
      expect(same).toBe(challenge); // 같은 인스턴스 반환
    });

    it('원본 인스턴스는 변경되지 않는다 (불변성)', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 1,
        targetProgress: 3,
        deadlineAt: new Date('2026-01-01T00:00:00Z'),
        status: 'active',
      });

      challenge.checkExpiry(new Date('2026-02-01T00:00:00Z'));

      expect(challenge.status).toBe('active');
    });
  });

  describe('progressPercent', () => {
    it('진행률 백분율을 올바르게 계산한다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 1,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(challenge.progressPercent).toBe(33);
    });

    it('진행률 0이면 0%를 반환한다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 0,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(challenge.progressPercent).toBe(0);
    });

    it('목표 달성이면 100%를 반환한다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 3,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(challenge.progressPercent).toBe(100);
    });

    it('반올림하여 정수로 반환한다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 2,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(challenge.progressPercent).toBe(67); // 66.67 -> 67
    });
  });

  describe('daysRemaining', () => {
    it('남은 일수를 올바르게 계산한다', () => {
      const deadlineAt = new Date();
      deadlineAt.setDate(deadlineAt.getDate() + 7);

      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 0,
        targetProgress: 3,
        deadlineAt,
      });

      expect(challenge.daysRemaining).toBe(7);
    });

    it('마감일이 지났으면 0을 반환한다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 0,
        targetProgress: 3,
        deadlineAt: new Date('2020-01-01T00:00:00Z'),
      });

      expect(challenge.daysRemaining).toBe(0);
    });
  });

  describe('isCloseToCompletion', () => {
    it('목표까지 1회 남았으면 true를 반환한다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 2,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(challenge.isCloseToCompletion).toBe(true);
    });

    it('목표까지 2회 이상 남았으면 false를 반환한다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 1,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(challenge.isCloseToCompletion).toBe(false);
    });

    it('이미 목표를 달성했으면 false를 반환한다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        currentProgress: 3,
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(challenge.isCloseToCompletion).toBe(false);
    });
  });

  describe('constructor', () => {
    it('옵션 없이 생성 시 기본값이 적용된다', () => {
      const challenge = new UserChallenge({
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        targetProgress: 3,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(challenge.id).toBeDefined();
      expect(challenge.status).toBe('active');
      expect(challenge.currentProgress).toBe(0);
      expect(challenge.completedAt).toBeNull();
      expect(challenge.startedAt).toBeInstanceOf(Date);
    });

    it('모든 옵션을 지정하여 생성할 수 있다', () => {
      const id = 'custom-id';
      const startedAt = new Date('2026-01-01T00:00:00Z');
      const deadlineAt = new Date('2026-01-15T00:00:00Z');
      const completedAt = new Date('2026-01-10T00:00:00Z');
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const updatedAt = new Date('2026-01-10T00:00:00Z');

      const challenge = new UserChallenge({
        id,
        userId: 'user-1',
        challengeTemplateId: 'template-1',
        status: 'completed',
        startedAt,
        deadlineAt,
        completedAt,
        currentProgress: 3,
        targetProgress: 3,
        createdAt,
        updatedAt,
      });

      expect(challenge.id).toBe(id);
      expect(challenge.status).toBe('completed');
      expect(challenge.startedAt).toBe(startedAt);
      expect(challenge.deadlineAt).toBe(deadlineAt);
      expect(challenge.completedAt).toBe(completedAt);
      expect(challenge.currentProgress).toBe(3);
      expect(challenge.createdAt).toBe(createdAt);
      expect(challenge.updatedAt).toBe(updatedAt);
    });
  });
});
