import { cronToHuman, cronToTimeInput, applyTimeToCron, normalizeCronForComparison } from './cron-utils';

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

describe('normalizeCronForComparison', () => {
  it('시각 순서만 다른 스케줄은 같은 문자열로 정규화한다', () => {
    expect(normalizeCronForComparison('0 18,7 * * *')).toBe(
      normalizeCronForComparison('0 7,18 * * *'),
    );
  });

  it('공백이 흐트러져도 같은 스케줄로 본다', () => {
    expect(normalizeCronForComparison('0  7   * * *')).toBe(
      normalizeCronForComparison('0 7 * * *'),
    );
  });

  it('시각이 다르면 다른 문자열이다', () => {
    expect(normalizeCronForComparison('0 7 * * *')).not.toBe(
      normalizeCronForComparison('0 8 * * *'),
    );
  });

  it('요일이 다르면 다른 문자열이다', () => {
    expect(normalizeCronForComparison('0 7 * * 1-5')).not.toBe(
      normalizeCronForComparison('0 7 * * *'),
    );
  });

  // parseInt('7-9')는 7이다. 범위를 숫자 목록처럼 읽으면 07:00 알림과 뭉개져
  // 새 알림 생성이 "중복"으로 차단된다.
  it('시각 범위를 단일 시각으로 뭉개지 않는다', () => {
    expect(normalizeCronForComparison('0 7-9 * * *')).not.toBe(
      normalizeCronForComparison('0 7 * * *'),
    );
  });

  it('와일드카드 시각을 빈 값으로 뭉개지 않는다', () => {
    expect(normalizeCronForComparison('0 * * * *')).not.toBe(
      normalizeCronForComparison('0 7 * * *'),
    );
  });

  it('스텝 표현식도 서로 구분한다', () => {
    expect(normalizeCronForComparison('0 */2 * * *')).not.toBe(
      normalizeCronForComparison('0 2 * * *'),
    );
  });

  it('필드 수가 맞지 않으면 원본을 그대로 쓴다', () => {
    expect(normalizeCronForComparison('0 7 * *')).toBe('0 7 * *');
  });
});

describe('숫자로 읽을 수 없는 시각 필드', () => {
  it('범위 시각을 단일 시각인 양 해석하지 않는다', () => {
    expect(cronToHuman('0 7-9 * * *')).toBe('0 7-9 * * *');
  });

  it('스텝 시각도 해석하지 않는다', () => {
    expect(cronToHuman('0 */2 * * *')).toBe('0 */2 * * *');
  });

  // 시각 하나를 고치려다 "평일만" 제한까지 잃으면 안 된다.
  it('시각을 못 읽어도 요일·일·월 제한은 보존한다', () => {
    expect(applyTimeToCron('0 7-9 * * 1-5', '09:00')).toBe('0 9 * * 1-5');
  });

  it('5필드가 아니면 매일로 폴백한다', () => {
    expect(applyTimeToCron('invalid', '09:05')).toBe('5 9 * * *');
  });
});
