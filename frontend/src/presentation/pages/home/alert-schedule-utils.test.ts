import { computeNextAlert } from './alert-schedule-utils';
import type { Alert } from '@infrastructure/api';

function buildAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    userId: 'user-1',
    name: 'Test Alert',
    schedule: '0 8 * * *',
    alertTypes: ['weather'],
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Alert;
}

describe('computeNextAlert', () => {
  it('returns null for empty alerts array', () => {
    expect(computeNextAlert([])).toBeNull();
  });

  it('returns null when all alerts are disabled', () => {
    const alerts = [buildAlert({ enabled: false })];
    expect(computeNextAlert(alerts)).toBeNull();
  });

  it('returns today time when alert is in the future', () => {
    const now = new Date(2026, 1, 17, 7, 0); // 7:00 AM
    const alerts = [buildAlert({ schedule: '30 8 * * *' })]; // 8:30
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:30', label: '날씨' });
  });

  it('returns "내일" prefix when alert is in the past today', () => {
    const now = new Date(2026, 1, 17, 10, 0); // 10:00 AM
    const alerts = [buildAlert({ schedule: '0 8 * * *' })]; // 8:00
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '내일 08:00', label: '날씨' });
  });

  it('picks the nearest future alert from multiple alerts', () => {
    const now = new Date(2026, 1, 17, 7, 0); // 7:00 AM
    const alerts = [
      buildAlert({ id: 'a1', schedule: '0 18 * * *', alertTypes: ['bus'] }), // 18:00 교통
      buildAlert({ id: 'a2', schedule: '30 7 * * *', alertTypes: ['weather'] }), // 07:30 날씨
    ];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '07:30', label: '날씨' });
  });

  it('handles comma-separated hours in schedule', () => {
    const now = new Date(2026, 1, 17, 9, 0); // 9:00 AM
    const alerts = [buildAlert({ schedule: '0 8,12,18 * * *' })]; // 8:00, 12:00, 18:00
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '12:00', label: '날씨' });
  });

  it('returns 교통 label for non-weather alert types', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '0 8 * * *', alertTypes: ['bus', 'subway'] })];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:00', label: '교통' });
  });

  it('prefers today alert over tomorrow alert', () => {
    const now = new Date(2026, 1, 17, 12, 0); // noon
    const alerts = [
      buildAlert({ id: 'a1', schedule: '0 7 * * *' }),  // 7:00 (past today → tomorrow)
      buildAlert({ id: 'a2', schedule: '0 14 * * *' }), // 14:00 (future today)
    ];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '14:00', label: '날씨' });
  });

  it('handles non-numeric cron minute gracefully', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '* 8 * * *' })]; // '*' minute → defaults to 0
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:00', label: '날씨' });
  });

  it('skips alerts with less than 2 schedule parts', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '30' })]; // invalid
    expect(computeNextAlert(alerts, now)).toBeNull();
  });

  it('pads single-digit hours and minutes', () => {
    const now = new Date(2026, 1, 17, 5, 0);
    const alerts = [buildAlert({ schedule: '5 6 * * *' })]; // 6:05
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '06:05', label: '날씨' });
  });
});
