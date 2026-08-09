import { Mission, MissionType } from './mission.entity';

describe('Mission', () => {
  describe('createNew', () => {
    it('출근 미션을 생성한다', () => {
      const mission = Mission.createNew('user-1', '영어 단어 10개', 'commute');
      expect(mission.userId).toBe('user-1');
      expect(mission.title).toBe('영어 단어 10개');
      expect(mission.missionType).toBe('commute');
      expect(mission.isActive).toBe(true);
      expect(mission.sortOrder).toBe(0);
      expect(mission.emoji).toBe('📖'); // '영어' keyword match
      expect(mission.id).toBeDefined();
    });

    it('퇴근 미션을 생성한다', () => {
      const mission = Mission.createNew('user-1', '하루 회고 쓰기', 'return');
      expect(mission.missionType).toBe('return');
      expect(mission.emoji).toBe('📝'); // '회고' keyword match
    });

    it('빈 제목이면 에러를 던진다', () => {
      expect(() => Mission.createNew('user-1', '', 'commute'))
        .toThrow('title은 1~100자여야 합니다');
    });

    it('100자 초과하면 에러를 던진다', () => {
      const longTitle = 'a'.repeat(101);
      expect(() => Mission.createNew('user-1', longTitle, 'commute'))
        .toThrow('title은 1~100자여야 합니다');
    });
  });

  describe('matchEmoji', () => {
    it.each([
      ['영어 단어 외우기', '📖'],
      ['독서 30분', '📚'],
      ['팟캐스트 듣기', '🎧'],
      ['뉴스 읽기', '📰'],
      ['일기 쓰기', '📝'],
      ['스트레칭 5분', '💪'],
      ['명상 10분', '🧘'],
      ['강의 듣기', '🎓'],
      ['알 수 없는 미션', '🎯'],
    ])('"%s"는 "%s" 이모지를 반환한다', (title, expectedEmoji) => {
      const mission = Mission.createNew('user-1', title, 'commute');
      expect(mission.emoji).toBe(expectedEmoji);
    });
  });

  describe('update', () => {
    it('제목을 수정하면 이모지도 업데이트된다', () => {
      const mission = Mission.createNew('user-1', '영어 단어', 'commute');
      mission.update({ title: '스트레칭 10분' });
      expect(mission.title).toBe('스트레칭 10분');
      expect(mission.emoji).toBe('💪');
    });

    it('타입을 변경한다', () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      mission.update({ missionType: 'return' });
      expect(mission.missionType).toBe('return');
    });

    it('emoji를 직접 지정하면 그것을 쓴다', () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      mission.update({ emoji: '🎧' });
      expect(mission.emoji).toBe('🎧');
    });

    it('제목과 emoji를 함께 바꾸면 사용자가 고른 emoji가 이긴다', () => {
      // 제목만 보고 재계산하면 '스트레칭'→💪가 되어 사용자 선택이 덮인다.
      const mission = Mission.createNew('user-1', '영어 단어', 'commute');
      mission.update({ title: '스트레칭 10분', emoji: '🎯' });
      expect(mission.title).toBe('스트레칭 10분');
      expect(mission.emoji).toBe('🎯');
    });
  });

  describe('createNew - emoji', () => {
    it('emoji를 지정하면 제목 추론 대신 그것을 쓴다', () => {
      const mission = Mission.createNew('user-1', '영어 단어', 'commute', '🧘');
      expect(mission.emoji).toBe('🧘');
    });

    it('emoji가 없으면 기존대로 제목에서 추론한다', () => {
      const mission = Mission.createNew('user-1', '영어 단어', 'commute');
      expect(mission.emoji).toBe('📖');
    });

    it('공백뿐인 emoji는 제목 추론으로 되돌린다', () => {
      const mission = Mission.createNew('user-1', '영어 단어', 'commute', '   ');
      expect(mission.emoji).toBe('📖');
    });
  });

  describe('toggleActive', () => {
    it('활성화/비활성화를 토글한다', () => {
      const mission = Mission.createNew('user-1', '독서', 'commute');
      expect(mission.isActive).toBe(true);
      mission.toggleActive();
      expect(mission.isActive).toBe(false);
      mission.toggleActive();
      expect(mission.isActive).toBe(true);
    });
  });
});
