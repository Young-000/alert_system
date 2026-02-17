import { cronToHuman } from './cron-utils';

describe('cronToHuman', () => {
  it('매일 정각 패턴을 올바르게 변환한다', () => {
    expect(cronToHuman('0 7 * * *')).toBe('매일 07:00');
  });

  it('매일 분이 있는 패턴을 올바르게 변환한다', () => {
    expect(cronToHuman('30 7 * * *')).toBe('매일 07:30');
  });

  it('평일 패턴(1-5)을 올바르게 변환한다', () => {
    expect(cronToHuman('0 7 * * 1-5')).toBe('평일 07:00');
  });

  it('주말 패턴(0,6)을 올바르게 변환한다', () => {
    expect(cronToHuman('0 7 * * 0,6')).toBe('주말 07:00');
  });

  it('커스텀 요일 패턴(1,3,5)을 올바르게 변환한다', () => {
    expect(cronToHuman('0 7 * * 1,3,5')).toBe('월,수,금 07:00');
  });

  it('복수 시간 패턴을 올바르게 변환한다', () => {
    expect(cronToHuman('0 7,18 * * *')).toBe('매일 07:00, 18:00');
  });

  it('퇴근 시간대를 올바르게 변환한다', () => {
    expect(cronToHuman('30 17 * * *')).toBe('매일 17:30');
  });

  it('평일 복수 시간을 올바르게 변환한다', () => {
    expect(cronToHuman('0 8,18 * * 1-5')).toBe('평일 08:00, 18:00');
  });

  it('자정 패턴을 올바르게 변환한다', () => {
    expect(cronToHuman('0 0 * * *')).toBe('매일 00:00');
  });

  it('빈 문자열이면 그대로 반환한다', () => {
    expect(cronToHuman('')).toBe('');
  });

  it('유효하지 않은 크론이면 원본을 반환한다', () => {
    expect(cronToHuman('invalid')).toBe('invalid');
  });

  it('필드가 5개가 아니면 원본을 반환한다', () => {
    expect(cronToHuman('0 7 * *')).toBe('0 7 * *');
  });

  it('6개 필드면 원본을 반환한다', () => {
    expect(cronToHuman('0 7 * * * *')).toBe('0 7 * * * *');
  });

  it('화,목,토 패턴을 올바르게 변환한다', () => {
    expect(cronToHuman('0 9 * * 2,4,6')).toBe('화,목,토 09:00');
  });

  it('전체 요일(0-6)은 매일로 변환한다', () => {
    expect(cronToHuman('0 7 * * 0-6')).toBe('매일 07:00');
  });

  it('쉼표로 구분된 전체 평일은 평일로 변환한다', () => {
    expect(cronToHuman('0 7 * * 1,2,3,4,5')).toBe('평일 07:00');
  });
});
