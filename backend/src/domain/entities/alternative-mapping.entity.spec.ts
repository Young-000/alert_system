import { AlternativeMapping } from './alternative-mapping.entity';

describe('AlternativeMapping', () => {
  function createMapping(overrides?: Partial<{
    from: string;
    fromLine: string;
    to: string;
    toLine: string;
    walk: number;
    bidirectional: boolean;
  }>): AlternativeMapping {
    return new AlternativeMapping(
      overrides?.from || '강남',
      overrides?.fromLine || '2호선',
      overrides?.to || '신논현',
      overrides?.toLine || '9호선',
      overrides?.walk || 5,
      {
        id: 'map-1',
        isBidirectional: overrides?.bidirectional ?? true,
        isActive: true,
      },
    );
  }

  describe('matchesStation', () => {
    it('from 방향으로 매칭된다', () => {
      const mapping = createMapping();
      expect(mapping.matchesStation('강남', '2호선')).toBe(true);
    });

    it('양방향일 때 to 방향으로도 매칭된다', () => {
      const mapping = createMapping({ bidirectional: true });
      expect(mapping.matchesStation('신논현', '9호선')).toBe(true);
    });

    it('단방향일 때 to 방향으로 매칭되지 않는다', () => {
      const mapping = createMapping({ bidirectional: false });
      expect(mapping.matchesStation('신논현', '9호선')).toBe(false);
    });

    it('역 이름이 다르면 매칭되지 않는다', () => {
      const mapping = createMapping();
      expect(mapping.matchesStation('신도림', '2호선')).toBe(false);
    });

    it('노선이 다르면 매칭되지 않는다', () => {
      const mapping = createMapping();
      expect(mapping.matchesStation('강남', '3호선')).toBe(false);
    });
  });

  describe('getAlternativeFor', () => {
    it('from 역을 입력하면 to 역 정보를 반환한다', () => {
      const mapping = createMapping();
      const alt = mapping.getAlternativeFor('강남', '2호선');

      expect(alt).not.toBeNull();
      expect(alt!.stationName).toBe('신논현');
      expect(alt!.line).toBe('9호선');
      expect(alt!.walkingMinutes).toBe(5);
    });

    it('양방향일 때 to 역을 입력하면 from 역 정보를 반환한다', () => {
      const mapping = createMapping({ bidirectional: true });
      const alt = mapping.getAlternativeFor('신논현', '9호선');

      expect(alt).not.toBeNull();
      expect(alt!.stationName).toBe('강남');
      expect(alt!.line).toBe('2호선');
    });

    it('단방향일 때 to 역을 입력하면 null을 반환한다', () => {
      const mapping = createMapping({ bidirectional: false });
      const alt = mapping.getAlternativeFor('신논현', '9호선');

      expect(alt).toBeNull();
    });

    it('매칭되지 않는 역을 입력하면 null을 반환한다', () => {
      const mapping = createMapping();
      const alt = mapping.getAlternativeFor('신도림', '1호선');

      expect(alt).toBeNull();
    });

    it('반환된 정보에 walkingDistanceMeters와 description이 포함된다', () => {
      const mapping = new AlternativeMapping('강남', '2호선', '신논현', '9호선', 5, {
        id: 'map-1',
        walkingDistanceMeters: 400,
        description: '5번 출구에서 나가세요',
        isBidirectional: true,
      });

      const alt = mapping.getAlternativeFor('강남', '2호선');

      expect(alt!.walkingDistanceMeters).toBe(400);
      expect(alt!.description).toBe('5번 출구에서 나가세요');
    });
  });

  describe('constructor defaults', () => {
    it('isBidirectional 기본값은 true', () => {
      const mapping = new AlternativeMapping('강남', '2호선', '신논현', '9호선', 5);
      expect(mapping.isBidirectional).toBe(true);
    });

    it('isActive 기본값은 true', () => {
      const mapping = new AlternativeMapping('강남', '2호선', '신논현', '9호선', 5);
      expect(mapping.isActive).toBe(true);
    });

    it('id가 없으면 빈 문자열', () => {
      const mapping = new AlternativeMapping('강남', '2호선', '신논현', '9호선', 5);
      expect(mapping.id).toBe('');
    });
  });
});
