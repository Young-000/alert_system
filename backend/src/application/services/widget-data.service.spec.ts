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
});
