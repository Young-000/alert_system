import {
  CommunityTip,
  MAX_CONTENT_LENGTH,
  AUTO_HIDE_REPORT_THRESHOLD,
  DAILY_TIP_LIMIT,
} from './community-tip.entity';

describe('CommunityTip', () => {
  describe('constructor', () => {
    it('기본값으로 인스턴스를 생성한다', () => {
      const tip = new CommunityTip({
        checkpointKey: 'station:uuid-123',
        authorId: 'user-1',
        content: '4번 출구가 빨라요',
      });

      expect(tip.id).toBe('');
      expect(tip.checkpointKey).toBe('station:uuid-123');
      expect(tip.authorId).toBe('user-1');
      expect(tip.content).toBe('4번 출구가 빨라요');
      expect(tip.helpfulCount).toBe(0);
      expect(tip.reportCount).toBe(0);
      expect(tip.isHidden).toBe(false);
      expect(tip.createdAt).toBeInstanceOf(Date);
    });

    it('명시적 값으로 인스턴스를 생성한다', () => {
      const tip = new CommunityTip({
        id: 'tip-1',
        checkpointKey: 'bus:stop-456',
        authorId: 'user-2',
        content: '이 정류장은 앞문 승차',
        helpfulCount: 5,
        reportCount: 1,
        isHidden: false,
        createdAt: new Date('2026-01-01'),
      });

      expect(tip.id).toBe('tip-1');
      expect(tip.helpfulCount).toBe(5);
      expect(tip.reportCount).toBe(1);
    });
  });

  describe('validateContent', () => {
    it('유효한 내용이면 null을 반환한다', () => {
      expect(CommunityTip.validateContent('4번 출구가 빨라요')).toBeNull();
    });

    it('빈 문자열이면 에러를 반환한다', () => {
      expect(CommunityTip.validateContent('')).toBe('팁 내용을 입력해주세요.');
    });

    it('공백만 있으면 에러를 반환한다', () => {
      expect(CommunityTip.validateContent('   ')).toBe('팁 내용을 입력해주세요.');
    });

    it('100자 초과하면 에러를 반환한다', () => {
      const longContent = 'a'.repeat(MAX_CONTENT_LENGTH + 1);
      expect(CommunityTip.validateContent(longContent)).toContain('100자');
    });

    it('정확히 100자는 유효하다', () => {
      const exactContent = 'a'.repeat(MAX_CONTENT_LENGTH);
      expect(CommunityTip.validateContent(exactContent)).toBeNull();
    });

    it('URL이 포함되면 에러를 반환한다', () => {
      expect(CommunityTip.validateContent('https://example.com 참고')).toBe('URL은 포함할 수 없습니다.');
      expect(CommunityTip.validateContent('www.example.com 참고')).toBe('URL은 포함할 수 없습니다.');
      expect(CommunityTip.validateContent('http://test 참고')).toBe('URL은 포함할 수 없습니다.');
      expect(CommunityTip.validateContent('example.com 참고')).toBe('URL은 포함할 수 없습니다.');
    });

    it('부적절한 표현이 포함되면 에러를 반환한다', () => {
      expect(CommunityTip.validateContent('시발 여기 너무 느려')).toBe('부적절한 표현이 포함되어 있습니다.');
      expect(CommunityTip.validateContent('fuck this station')).toBe('부적절한 표현이 포함되어 있습니다.');
    });

    it('일반적인 한국어 팁은 유효하다', () => {
      expect(CommunityTip.validateContent('에스컬레이터 타면 3분 절약')).toBeNull();
      expect(CommunityTip.validateContent('2호선 5-3 칸이 환승에 가까워요')).toBeNull();
      expect(CommunityTip.validateContent('오전 8시대는 뒤쪽 칸이 덜 붐벼요')).toBeNull();
    });
  });

  describe('shouldAutoHide', () => {
    it('신고 3회 미만이면 숨기지 않는다', () => {
      const tip = new CommunityTip({
        checkpointKey: 'station:1',
        authorId: 'user-1',
        content: 'test',
        reportCount: AUTO_HIDE_REPORT_THRESHOLD - 1,
      });
      expect(tip.shouldAutoHide()).toBe(false);
    });

    it('신고 3회 이상이면 숨긴다', () => {
      const tip = new CommunityTip({
        checkpointKey: 'station:1',
        authorId: 'user-1',
        content: 'test',
        reportCount: AUTO_HIDE_REPORT_THRESHOLD,
      });
      expect(tip.shouldAutoHide()).toBe(true);
    });

    it('신고 3회 초과도 숨긴다', () => {
      const tip = new CommunityTip({
        checkpointKey: 'station:1',
        authorId: 'user-1',
        content: 'test',
        reportCount: AUTO_HIDE_REPORT_THRESHOLD + 2,
      });
      expect(tip.shouldAutoHide()).toBe(true);
    });
  });

  describe('exceedsDailyLimit', () => {
    it('3회 미만이면 초과하지 않았다', () => {
      expect(CommunityTip.exceedsDailyLimit(0)).toBe(false);
      expect(CommunityTip.exceedsDailyLimit(1)).toBe(false);
      expect(CommunityTip.exceedsDailyLimit(2)).toBe(false);
    });

    it('3회 이상이면 초과했다', () => {
      expect(CommunityTip.exceedsDailyLimit(DAILY_TIP_LIMIT)).toBe(true);
      expect(CommunityTip.exceedsDailyLimit(DAILY_TIP_LIMIT + 1)).toBe(true);
    });
  });
});
