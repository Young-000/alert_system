import { cronToHuman, cronToTimeInput, applyTimeToCron } from './cron-utils';

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

describe('cronToTimeInput', () => {
  it('첫 시각을 HH:mm으로 반환한다', () => {
    expect(cronToTimeInput('30 7 * * *')).toBe('07:30');
  });

  it('복수 시간이면 가장 이른 시각을 반환한다', () => {
    expect(cronToTimeInput('0 7,18 * * *')).toBe('07:00');
  });

  it('자정을 00:00으로 반환한다', () => {
    expect(cronToTimeInput('0 0 * * *')).toBe('00:00');
  });

  it('파싱할 수 없으면 기본값을 반환한다', () => {
    expect(cronToTimeInput('invalid')).toBe('07:00');
    expect(cronToTimeInput('')).toBe('07:00');
  });
});

describe('applyTimeToCron', () => {
  it('단일 시각 크론의 시/분을 교체한다', () => {
    expect(applyTimeToCron('0 7 * * *', '09:30')).toBe('30 9 * * *');
  });

  // 회귀 방지: 이름만 바꾸려고 수정 모달을 열어도 퇴근 알림 시각이 사라졌었다.
  it('복수 시간 알림에서 나머지 시각을 보존한다', () => {
    expect(applyTimeToCron('0 7,18 * * *', '08:00')).toBe('0 8,18 * * *');
  });

  it('시각을 바꾸지 않으면 크론이 그대로 유지된다', () => {
    expect(applyTimeToCron('0 7,12,18 * * *', '07:00')).toBe('0 7,12,18 * * *');
  });

  it('요일·일·월 필드를 보존한다', () => {
    expect(applyTimeToCron('0 8,18 * * 1-5', '09:00')).toBe('0 9,18 * * 1-5');
  });

  it('교체 후에도 시각은 오름차순으로 정렬된다', () => {
    expect(applyTimeToCron('0 7,18 * * *', '20:00')).toBe('0 18,20 * * *');
  });

  it('중복된 시각은 하나로 합친다', () => {
    expect(applyTimeToCron('0 7,18 * * *', '18:00')).toBe('0 18 * * *');
  });

  it('원본 크론이 유효하지 않으면 매일 단일 시각으로 만든다', () => {
    expect(applyTimeToCron('invalid', '09:05')).toBe('5 9 * * *');
  });

  it('입력 시각이 유효하지 않으면 원본 크론을 유지한다', () => {
    expect(applyTimeToCron('0 7,18 * * *', '')).toBe('0 7,18 * * *');
  });
});
