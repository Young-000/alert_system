import { UserBadge } from './user-badge.entity';

describe('UserBadge', () => {
  describe('create', () => {
    it('유효한 파라미터로 배지를 생성하면 모든 필드가 올바르게 설정된다', () => {
      const badge = UserBadge.create(
        'user-1',
        'lightning',
        '번개',
        '⚡',
        'challenge-uuid-1',
      );

      expect(badge.userId).toBe('user-1');
      expect(badge.badgeId).toBe('lightning');
      expect(badge.badgeName).toBe('번개');
      expect(badge.badgeEmoji).toBe('⚡');
      expect(badge.challengeId).toBe('challenge-uuid-1');
      expect(badge.id).toBeDefined();
      expect(badge.earnedAt).toBeInstanceOf(Date);
      expect(badge.createdAt).toBeInstanceOf(Date);
    });

    it('userId가 빈 문자열이면 에러를 던진다', () => {
      expect(() =>
        UserBadge.create('', 'lightning', '번개', '⚡', 'challenge-1'),
      ).toThrow('userId is required');
    });

    it('userId가 공백만 있으면 에러를 던진다', () => {
      expect(() =>
        UserBadge.create('   ', 'lightning', '번개', '⚡', 'challenge-1'),
      ).toThrow('userId is required');
    });

    it('badgeId가 빈 문자열이면 에러를 던진다', () => {
      expect(() =>
        UserBadge.create('user-1', '', '번개', '⚡', 'challenge-1'),
      ).toThrow('badgeId is required');
    });

    it('challengeId가 빈 문자열이면 에러를 던진다', () => {
      expect(() =>
        UserBadge.create('user-1', 'lightning', '번개', '⚡', ''),
      ).toThrow('challengeId is required');
    });
  });

  describe('constructor', () => {
    it('옵션 없이 생성 시 기본값이 적용된다', () => {
      const badge = new UserBadge({
        userId: 'user-1',
        badgeId: 'lightning',
        badgeName: '번개',
        badgeEmoji: '⚡',
        challengeId: 'challenge-1',
      });

      expect(badge.id).toBeDefined();
      expect(badge.earnedAt).toBeInstanceOf(Date);
      expect(badge.createdAt).toBeInstanceOf(Date);
    });

    it('모든 옵션을 지정하여 생성할 수 있다', () => {
      const earnedAt = new Date('2026-02-01T00:00:00Z');
      const createdAt = new Date('2026-02-01T00:00:00Z');

      const badge = new UserBadge({
        id: 'custom-id',
        userId: 'user-1',
        badgeId: 'lightning',
        badgeName: '번개',
        badgeEmoji: '⚡',
        challengeId: 'challenge-1',
        earnedAt,
        createdAt,
      });

      expect(badge.id).toBe('custom-id');
      expect(badge.earnedAt).toBe(earnedAt);
      expect(badge.createdAt).toBe(createdAt);
    });
  });
});
