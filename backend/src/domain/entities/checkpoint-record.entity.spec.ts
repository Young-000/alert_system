import { CheckpointRecord } from './checkpoint-record.entity';

describe('CheckpointRecord', () => {
  describe('getArrivalTimeString — KST 표기', () => {
    it('UTC 전날 밤 도착을 KST 오전으로 표기한다', () => {
      // 서버 TZ가 UTC인 프로덕션에서 getHours() 기반이면 '22:45'로 표기된다.
      const record = new CheckpointRecord(
        'session-1',
        'checkpoint-1',
        new Date('2026-07-26T22:45:00Z'),
      );

      expect(record.getArrivalTimeString()).toBe('07:45');
    });

    it('KST 자정을 00:00으로 표기한다', () => {
      const record = new CheckpointRecord(
        'session-1',
        'checkpoint-1',
        new Date('2026-07-26T15:00:00Z'),
      );

      expect(record.getArrivalTimeString()).toBe('00:00');
    });

    it('UTC/KST 날짜가 같은 낮 시간대도 KST 시각으로 표기한다', () => {
      const record = new CheckpointRecord(
        'session-1',
        'checkpoint-1',
        new Date('2026-07-27T03:20:00Z'),
      );

      expect(record.getArrivalTimeString()).toBe('12:20');
    });
  });

  describe('getDelayStatus', () => {
    const at = (delayMinutes: number) =>
      new CheckpointRecord('s', 'c', new Date('2026-07-27T00:00:00Z'), { delayMinutes });

    it('지연이 없으면 정시로 표기한다', () => {
      expect(at(0).getDelayStatus()).toBe('정시');
    });

    it('지연은 + 부호를 붙인다', () => {
      expect(at(4).getDelayStatus()).toBe('+4분');
    });

    it('단축은 음수 그대로 표기한다', () => {
      expect(at(-3).getDelayStatus()).toBe('-3분');
    });
  });
});
