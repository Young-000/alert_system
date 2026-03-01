import { classifyTimeSlot, detectCurrentTimeSlot } from './time-slot.util';
import { TimeSlot } from '@domain/entities/segment-congestion.entity';

describe('classifyTimeSlot', () => {
  // Helper: create a Date at a specific KST hour
  // KST = UTC + 9, so for 08:15 KST, UTC = 23:15 previous day
  function createKstDate(kstHour: number, kstMinute = 0): Date {
    const utcHour = (kstHour - 9 + 24) % 24;
    // Use a fixed date in the middle of a month to avoid date boundary issues
    const date = new Date(Date.UTC(2026, 2, 15, utcHour, kstMinute));
    return date;
  }

  it('08:15 KST는 morning_rush로 분류된다', () => {
    const date = createKstDate(8, 15);
    expect(classifyTimeSlot(date)).toBe('morning_rush');
  });

  it('07:00 KST는 morning_rush로 분류된다 (경계값)', () => {
    const date = createKstDate(7, 0);
    expect(classifyTimeSlot(date)).toBe('morning_rush');
  });

  it('08:59 KST는 morning_rush로 분류된다', () => {
    const date = createKstDate(8, 59);
    expect(classifyTimeSlot(date)).toBe('morning_rush');
  });

  it('09:00 KST는 morning_late로 분류된다 (경계값)', () => {
    const date = createKstDate(9, 0);
    expect(classifyTimeSlot(date)).toBe('morning_late');
  });

  it('10:30 KST는 morning_late로 분류된다', () => {
    const date = createKstDate(10, 30);
    expect(classifyTimeSlot(date)).toBe('morning_late');
  });

  it('11:00 KST는 afternoon으로 분류된다 (경계값)', () => {
    const date = createKstDate(11, 0);
    expect(classifyTimeSlot(date)).toBe('afternoon');
  });

  it('14:00 KST는 afternoon으로 분류된다', () => {
    const date = createKstDate(14, 0);
    expect(classifyTimeSlot(date)).toBe('afternoon');
  });

  it('16:59 KST는 afternoon으로 분류된다', () => {
    const date = createKstDate(16, 59);
    expect(classifyTimeSlot(date)).toBe('afternoon');
  });

  it('17:00 KST는 evening_rush로 분류된다 (경계값)', () => {
    const date = createKstDate(17, 0);
    expect(classifyTimeSlot(date)).toBe('evening_rush');
  });

  it('18:30 KST는 evening_rush로 분류된다', () => {
    const date = createKstDate(18, 30);
    expect(classifyTimeSlot(date)).toBe('evening_rush');
  });

  it('19:00 KST는 evening_late로 분류된다 (경계값)', () => {
    const date = createKstDate(19, 0);
    expect(classifyTimeSlot(date)).toBe('evening_late');
  });

  it('21:59 KST는 evening_late로 분류된다', () => {
    const date = createKstDate(21, 59);
    expect(classifyTimeSlot(date)).toBe('evening_late');
  });

  it('22:00 KST는 off_peak로 분류된다 (경계값)', () => {
    const date = createKstDate(22, 0);
    expect(classifyTimeSlot(date)).toBe('off_peak');
  });

  it('03:00 KST는 off_peak로 분류된다', () => {
    const date = createKstDate(3, 0);
    expect(classifyTimeSlot(date)).toBe('off_peak');
  });

  it('06:59 KST는 off_peak로 분류된다', () => {
    const date = createKstDate(6, 59);
    expect(classifyTimeSlot(date)).toBe('off_peak');
  });

  it('00:00 KST는 off_peak로 분류된다 (자정)', () => {
    const date = createKstDate(0, 0);
    expect(classifyTimeSlot(date)).toBe('off_peak');
  });

  describe('모든 시간대가 커버된다', () => {
    const expectedSlots: [number, TimeSlot][] = [
      [0, 'off_peak'],
      [1, 'off_peak'],
      [2, 'off_peak'],
      [3, 'off_peak'],
      [4, 'off_peak'],
      [5, 'off_peak'],
      [6, 'off_peak'],
      [7, 'morning_rush'],
      [8, 'morning_rush'],
      [9, 'morning_late'],
      [10, 'morning_late'],
      [11, 'afternoon'],
      [12, 'afternoon'],
      [13, 'afternoon'],
      [14, 'afternoon'],
      [15, 'afternoon'],
      [16, 'afternoon'],
      [17, 'evening_rush'],
      [18, 'evening_rush'],
      [19, 'evening_late'],
      [20, 'evening_late'],
      [21, 'evening_late'],
      [22, 'off_peak'],
      [23, 'off_peak'],
    ];

    expectedSlots.forEach(([hour, expectedSlot]) => {
      it(`KST ${hour}시는 ${expectedSlot}이다`, () => {
        expect(classifyTimeSlot(createKstDate(hour))).toBe(expectedSlot);
      });
    });
  });
});

describe('detectCurrentTimeSlot', () => {
  it('현재 시간에 대한 TimeSlot을 반환한다', () => {
    const slot = detectCurrentTimeSlot();
    const validSlots: TimeSlot[] = [
      'morning_rush',
      'morning_late',
      'afternoon',
      'evening_rush',
      'evening_late',
      'off_peak',
    ];
    expect(validSlots).toContain(slot);
  });
});
