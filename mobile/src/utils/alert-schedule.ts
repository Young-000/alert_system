import type { Alert } from '@/types/home';

/**
 * Computes the next upcoming alert time from a list of alerts.
 * Returns null if no enabled alerts exist.
 */
export function computeNextAlert(
  alerts: Alert[],
  now?: Date,
): { time: string; label: string } | null {
  const enabled = alerts.filter((a) => a.enabled);
  if (enabled.length === 0) return null;

  const currentTime = now ?? new Date();
  const curH = currentTime.getHours();
  const curM = currentTime.getMinutes();

  let best: { h: number; m: number; label: string; isToday: boolean } | null =
    null;

  for (const alert of enabled) {
    const parts = alert.schedule.split(' ');
    if (parts.length < 2) continue;

    const cronMin = isNaN(Number(parts[0])) ? 0 : Number(parts[0]);
    const hours = (parts[1] ?? '').includes(',')
      ? (parts[1] ?? '').split(',').map(Number).filter((h) => !isNaN(h))
      : [Number(parts[1])].filter((h) => !isNaN(h));

    const label = alert.alertTypes.includes('weather') ? '날씨 + 교통 알림' : '교통 알림';

    for (const h of hours) {
      const isToday = h > curH || (h === curH && cronMin > curM);
      if (
        !best ||
        (isToday && !best.isToday) ||
        (isToday === best.isToday &&
          (h < best.h || (h === best.h && cronMin < best.m)))
      ) {
        best = { h, m: cronMin, label, isToday };
      }
    }
  }

  if (!best) return null;

  const timeStr = `${String(best.h).padStart(2, '0')}:${String(best.m).padStart(2, '0')}`;
  return {
    time: best.isToday ? timeStr : `내일 ${timeStr}`,
    label: best.label,
  };
}
