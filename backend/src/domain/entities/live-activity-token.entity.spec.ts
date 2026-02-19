import { LiveActivityToken } from './live-activity-token.entity';

describe('LiveActivityToken', () => {
  describe('create', () => {
    it('유효한 파라미터로 토큰 생성 성공', () => {
      const token = LiveActivityToken.create(
        'user-123',
        'activity-001',
        'push-token-abc',
        'commute',
        'setting-uuid-1',
      );

      expect(token.userId).toBe('user-123');
      expect(token.activityId).toBe('activity-001');
      expect(token.pushToken).toBe('push-token-abc');
      expect(token.mode).toBe('commute');
      expect(token.settingId).toBe('setting-uuid-1');
      expect(token.isActive).toBe(true);
      expect(token.id).toBeDefined();
      expect(token.createdAt).toBeInstanceOf(Date);
      expect(token.updatedAt).toBeInstanceOf(Date);
    });

    it('settingId 없이도 생성 가능', () => {
      const token = LiveActivityToken.create(
        'user-123',
        'activity-002',
        'push-token-def',
        'return',
      );

      expect(token.settingId).toBeNull();
      expect(token.mode).toBe('return');
    });

    it('빈 activityId면 에러', () => {
      expect(() =>
        LiveActivityToken.create('user-123', '', 'push-token', 'commute'),
      ).toThrow('activityId is required');
    });

    it('공백만 있는 activityId면 에러', () => {
      expect(() =>
        LiveActivityToken.create('user-123', '   ', 'push-token', 'commute'),
      ).toThrow('activityId is required');
    });

    it('빈 pushToken이면 에러', () => {
      expect(() =>
        LiveActivityToken.create('user-123', 'activity-001', '', 'commute'),
      ).toThrow('pushToken is required');
    });

    it('잘못된 mode면 에러', () => {
      expect(() =>
        LiveActivityToken.create(
          'user-123',
          'activity-001',
          'push-token',
          'invalid' as any,
        ),
      ).toThrow("Invalid mode: invalid. Must be 'commute' or 'return'");
    });
  });

  describe('deactivate', () => {
    it('토큰 비활성화', () => {
      const token = LiveActivityToken.create(
        'user-123',
        'activity-001',
        'push-token-abc',
        'commute',
      );

      const deactivated = token.deactivate();

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.id).toBe(token.id);
      expect(deactivated.userId).toBe(token.userId);
      expect(deactivated.activityId).toBe(token.activityId);
      expect(deactivated.pushToken).toBe(token.pushToken);
      expect(deactivated.mode).toBe(token.mode);
      expect(deactivated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        token.updatedAt.getTime(),
      );
    });

    it('비활성화해도 원본 토큰은 변경되지 않음 (불변성)', () => {
      const token = LiveActivityToken.create(
        'user-123',
        'activity-001',
        'push-token-abc',
        'commute',
      );

      token.deactivate();

      expect(token.isActive).toBe(true);
    });
  });

  describe('updatePushToken', () => {
    it('push token 업데이트', () => {
      const token = LiveActivityToken.create(
        'user-123',
        'activity-001',
        'old-push-token',
        'commute',
      );

      const updated = token.updatePushToken('new-push-token');

      expect(updated.pushToken).toBe('new-push-token');
      expect(updated.id).toBe(token.id);
      expect(updated.activityId).toBe(token.activityId);
      expect(updated.isActive).toBe(token.isActive);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        token.updatedAt.getTime(),
      );
    });

    it('push token 업데이트해도 원본은 변경되지 않음 (불변성)', () => {
      const token = LiveActivityToken.create(
        'user-123',
        'activity-001',
        'old-push-token',
        'commute',
      );

      token.updatePushToken('new-push-token');

      expect(token.pushToken).toBe('old-push-token');
    });
  });

  describe('constructor', () => {
    it('옵션 없이 생성 시 기본값 적용', () => {
      const token = new LiveActivityToken(
        'user-123',
        'activity-001',
        'push-token',
        'commute',
      );

      expect(token.id).toBeDefined();
      expect(token.settingId).toBeNull();
      expect(token.isActive).toBe(true);
    });

    it('모든 옵션 지정하여 생성', () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const updatedAt = new Date('2026-02-01T00:00:00Z');

      const token = new LiveActivityToken(
        'user-123',
        'activity-001',
        'push-token',
        'return',
        {
          id: 'custom-id',
          settingId: 'setting-1',
          isActive: false,
          createdAt,
          updatedAt,
        },
      );

      expect(token.id).toBe('custom-id');
      expect(token.settingId).toBe('setting-1');
      expect(token.isActive).toBe(false);
      expect(token.createdAt).toBe(createdAt);
      expect(token.updatedAt).toBe(updatedAt);
    });
  });
});
