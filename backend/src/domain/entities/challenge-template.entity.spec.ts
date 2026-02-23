import {
  ChallengeTemplate,
} from './challenge-template.entity';

const validOptions = {
  id: 'time-under-40',
  category: 'time_goal' as const,
  name: '40분 이내 출근',
  description: '출근 시간을 40분 이내로 3회 달성하세요',
  targetValue: 3,
  conditionType: 'duration_under' as const,
  conditionValue: 40,
  durationDays: 14,
  badgeId: 'lightning',
  badgeName: '번개',
  badgeEmoji: '⚡',
  difficulty: 'medium' as const,
  sortOrder: 1,
};

describe('ChallengeTemplate', () => {
  describe('create', () => {
    it('유효한 옵션으로 템플릿을 생성하면 모든 필드가 올바르게 설정된다', () => {
      const template = ChallengeTemplate.create(validOptions);

      expect(template.id).toBe('time-under-40');
      expect(template.category).toBe('time_goal');
      expect(template.name).toBe('40분 이내 출근');
      expect(template.description).toBe('출근 시간을 40분 이내로 3회 달성하세요');
      expect(template.targetValue).toBe(3);
      expect(template.conditionType).toBe('duration_under');
      expect(template.conditionValue).toBe(40);
      expect(template.durationDays).toBe(14);
      expect(template.badgeId).toBe('lightning');
      expect(template.badgeName).toBe('번개');
      expect(template.badgeEmoji).toBe('⚡');
      expect(template.difficulty).toBe('medium');
      expect(template.sortOrder).toBe(1);
      expect(template.isActive).toBe(true);
      expect(template.createdAt).toBeInstanceOf(Date);
    });

    it('sortOrder를 지정하지 않으면 기본값 0이 설정된다', () => {
      const { sortOrder, ...optionsWithoutSort } = validOptions;
      const template = ChallengeTemplate.create(optionsWithoutSort);

      expect(template.sortOrder).toBe(0);
    });

    it('isActive를 지정하지 않으면 기본값 true가 설정된다', () => {
      const template = ChallengeTemplate.create(validOptions);

      expect(template.isActive).toBe(true);
    });

    it('isActive를 false로 지정하면 false가 설정된다', () => {
      const template = ChallengeTemplate.create({ ...validOptions, isActive: false });

      expect(template.isActive).toBe(false);
    });

    it('name이 빈 문자열이면 에러를 던진다', () => {
      expect(() =>
        ChallengeTemplate.create({ ...validOptions, name: '' }),
      ).toThrow('name is required');
    });

    it('name이 공백만 있으면 에러를 던진다', () => {
      expect(() =>
        ChallengeTemplate.create({ ...validOptions, name: '   ' }),
      ).toThrow('name is required');
    });

    it('targetValue가 0이면 에러를 던진다', () => {
      expect(() =>
        ChallengeTemplate.create({ ...validOptions, targetValue: 0 }),
      ).toThrow('targetValue must be greater than 0');
    });

    it('targetValue가 음수이면 에러를 던진다', () => {
      expect(() =>
        ChallengeTemplate.create({ ...validOptions, targetValue: -1 }),
      ).toThrow('targetValue must be greater than 0');
    });

    it('durationDays가 0이면 에러를 던진다', () => {
      expect(() =>
        ChallengeTemplate.create({ ...validOptions, durationDays: 0 }),
      ).toThrow('durationDays must be greater than 0');
    });

    it('durationDays가 음수이면 에러를 던진다', () => {
      expect(() =>
        ChallengeTemplate.create({ ...validOptions, durationDays: -5 }),
      ).toThrow('durationDays must be greater than 0');
    });
  });

  describe('constructor', () => {
    it('모든 옵션을 지정하여 생성할 수 있다', () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const template = new ChallengeTemplate({
        ...validOptions,
        isActive: false,
        createdAt,
      });

      expect(template.id).toBe('time-under-40');
      expect(template.isActive).toBe(false);
      expect(template.createdAt).toBe(createdAt);
    });
  });
});
