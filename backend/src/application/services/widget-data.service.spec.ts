import { WidgetDataService } from './widget-data.service';
import { Alert, AlertType } from '@domain/entities/alert.entity';

/**
 * computeNextAlert는 알림의 cron 요일 필드를 반드시 반영해야 한다.
 *
 * EventBridge는 `convertToEventBridgeCron()`으로 요일을 그대로 옮겨 실제 발화는
 * 요일을 지킨다 (`eventbridge-scheduler.service.ts:276`). 위젯이 요일을 무시하면
 * "발화하지 않는 날"을 다음 알림으로 단언하게 된다.
 */
describe('WidgetDataService.computeNextAlert', () => {
  let service: WidgetDataService;

  // 2026-08-01(토) 10:00 KST = 2026-08-01T01:00:00Z
  const SATURDAY_10AM_KST = new Date('2026-08-01T01:00:00Z');
  // 2026-08-03(월) 07:00 KST = 2026-08-02T22:00:00Z
  const MONDAY_7AM_KST = new Date('2026-08-02T22:00:00Z');

  const makeAlert = (schedule: string): Alert =>
    new Alert('user-1', '출근 알림', schedule, [AlertType.WEATHER]);

  beforeEach(() => {
    service = new WidgetDataService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('평일 전용 알림은 토요일에 "내일"(일요일)을 다음 알림으로 말하지 않는다', () => {
    jest.setSystemTime(SATURDAY_10AM_KST);

    const result = service.computeNextAlert([makeAlert('0 8 * * 1-5')]);

    expect(result).not.toBeNull();
    // 토요일 10시 → 다음 발화는 월요일 08:00. "내일"은 일요일이라 거짓이다.
    expect(result!.time).not.toContain('내일');
    expect(result!.time).toBe('월 08:00');
  });

  it('주말 전용 알림은 월요일에 토요일을 가리킨다', () => {
    jest.setSystemTime(MONDAY_7AM_KST);

    const result = service.computeNextAlert([makeAlert('0 9 * * 0,6')]);

    expect(result).not.toBeNull();
    expect(result!.time).toBe('토 09:00');
  });

  it('매일 알림은 아직 시각 전이면 오늘로 표시한다', () => {
    jest.setSystemTime(MONDAY_7AM_KST);

    const result = service.computeNextAlert([makeAlert('0 8 * * *')]);

    expect(result!.time).toBe('08:00');
  });

  it('매일 알림은 시각이 지났으면 내일로 표시한다', () => {
    jest.setSystemTime(SATURDAY_10AM_KST);

    const result = service.computeNextAlert([makeAlert('0 8 * * *')]);

    expect(result!.time).toBe('내일 08:00');
  });

  it('평일 알림도 평일 아침이면 오늘로 표시한다', () => {
    jest.setSystemTime(MONDAY_7AM_KST);

    const result = service.computeNextAlert([makeAlert('0 8 * * 1-5')]);

    expect(result!.time).toBe('08:00');
  });

  it('여러 알림 중 실제로 가장 먼저 발화하는 것을 고른다', () => {
    jest.setSystemTime(SATURDAY_10AM_KST);

    // 평일 07:00(→월요일)보다 주말 18:00(→오늘 토요일)이 먼저다.
    const result = service.computeNextAlert([
      makeAlert('0 7 * * 1-5'),
      makeAlert('0 18 * * 0,6'),
    ]);

    expect(result!.time).toBe('18:00');
  });

  it('비활성 알림은 제외한다', () => {
    jest.setSystemTime(SATURDAY_10AM_KST);

    const disabled = makeAlert('0 18 * * 0,6');
    disabled.disable();

    const result = service.computeNextAlert([disabled]);

    expect(result).toBeNull();
  });

  it('알림이 없으면 null을 반환한다', () => {
    jest.setSystemTime(SATURDAY_10AM_KST);
    expect(service.computeNextAlert([])).toBeNull();
  });

  /**
   * `0 7,18 * * *`(출근+퇴근)는 웹 편집 모달이 일부러 보존하는 정식 형태고
   * (`cron-utils.ts:62`) EventBridge도 두 시각 모두에 발화한다.
   *
   * 위젯은 `alert.notificationTime`(크론의 **첫 시각**만 담는다)만 읽어
   * 오늘 저녁 발화를 통째로 못 보고 "내일 07:00"이라 말했다.
   */
  describe('하루에 두 번 울리는 알림', () => {
    it('오전 발화가 지났으면 같은 날 저녁 발화를 가리킨다', () => {
      jest.setSystemTime(SATURDAY_10AM_KST);

      const result = service.computeNextAlert([makeAlert('0 7,18 * * *')]);

      expect(result!.time).toBe('18:00');
    });

    it('두 발화가 모두 남았으면 이른 쪽을 가리킨다', () => {
      // 월요일 07:00 KST — 같은 날 18:00 과 07:00 이 모두 후보다.
      jest.setSystemTime(new Date('2026-08-02T21:00:00Z')); // 월 06:00 KST

      const result = service.computeNextAlert([makeAlert('0 7,18 * * *')]);

      expect(result!.time).toBe('07:00');
    });

    it('저녁 발화까지 지났으면 다음 날 이른 발화를 가리킨다', () => {
      jest.setSystemTime(new Date('2026-08-01T11:00:00Z')); // 토 20:00 KST

      const result = service.computeNextAlert([makeAlert('0 7,18 * * *')]);

      expect(result!.time).toBe('내일 07:00');
    });

    /** 요일 제한은 그대로 지켜야 한다 — 평일 전용이면 토요일 저녁은 후보가 아니다. */
    it('요일 제한을 함께 지킨다', () => {
      jest.setSystemTime(SATURDAY_10AM_KST);

      const result = service.computeNextAlert([makeAlert('0 7,18 * * 1-5')]);

      expect(result!.time).toBe('월 07:00');
    });
  });

  /**
   * 모바일은 offset 7(다음 주 같은 요일)까지 본다
   * (`mobile/src/utils/alert-schedule.ts:24` — 주 1회 알림이 그날 시각을 넘긴
   * 순간 사라지는 것을 막으려고 일부러 그렇게 했다).
   *
   * 위젯은 이 서비스가 "port of mobile app's computeNextAlert() logic"이라고
   * 적어 두고도 offset 6까지만 훑어, 같은 상황에서 "다음 알림 없음"이 된다.
   */
  describe('주 1회 알림', () => {
    it('그날 시각이 지나도 다음 주 같은 요일을 가리킨다', () => {
      jest.setSystemTime(new Date('2026-08-03T00:00:00Z')); // 월 09:00 KST

      const result = service.computeNextAlert([makeAlert('0 8 * * 1')]);

      expect(result).not.toBeNull();
      expect(result!.time).toBe('다음 주 월 08:00');
    });

    it('그날 시각 전이면 오늘을 가리킨다', () => {
      jest.setSystemTime(MONDAY_7AM_KST);

      const result = service.computeNextAlert([makeAlert('0 8 * * 1')]);

      expect(result!.time).toBe('08:00');
    });
  });
});
