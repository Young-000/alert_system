import { CommuteRecord, CommuteType } from './commute-record.entity';

describe('CommuteRecord', () => {
  describe('getActualDepartureTime — KST 표기', () => {
    it('UTC 전날 밤 시각을 KST 오전으로 표기한다', () => {
      // 프로덕션(ECS)은 TZ 미지정 → Node가 UTC. getHours() 기반이면 '22:30'이 나온다.
      const record = new CommuteRecord(
        'user-1',
        '2026-07-27',
        CommuteType.MORNING,
        { actualDeparture: new Date('2026-07-26T22:30:00Z') },
      );

      expect(record.getActualDepartureTime()).toBe('07:30');
    });

    it('KST 자정 직후를 00:xx로 표기한다', () => {
      const record = new CommuteRecord(
        'user-1',
        '2026-07-27',
        CommuteType.MORNING,
        { actualDeparture: new Date('2026-07-26T15:05:00Z') },
      );

      expect(record.getActualDepartureTime()).toBe('00:05');
    });

    it('actualDeparture가 없으면 undefined를 반환한다', () => {
      const record = new CommuteRecord('user-1', '2026-07-27', CommuteType.MORNING);

      expect(record.getActualDepartureTime()).toBeUndefined();
    });
  });

  describe('createFromDepartureConfirmation — KST 오전/오후 판정', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('KST 07:00에 생성하면 출근(MORNING)으로 분류한다', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-26T22:00:00Z')); // KST 07:00

      const record = CommuteRecord.createFromDepartureConfirmation('user-1', 'alert-1');

      expect(record.commuteType).toBe(CommuteType.MORNING);
      // 날짜도 KST 달력 기준이어야 한다 (UTC로는 7/26).
      expect(record.commuteDate).toBe('2026-07-27');
    });

    it('KST 19:00에 생성하면 퇴근(EVENING)으로 분류한다', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-27T10:00:00Z')); // KST 19:00

      const record = CommuteRecord.createFromDepartureConfirmation('user-1', 'alert-1');

      expect(record.commuteType).toBe(CommuteType.EVENING);
      expect(record.commuteDate).toBe('2026-07-27');
    });
  });
});
