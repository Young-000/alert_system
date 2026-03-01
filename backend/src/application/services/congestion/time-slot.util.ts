import { TimeSlot } from '@domain/entities/segment-congestion.entity';

/**
 * Time slot boundaries in KST hours.
 * KST = UTC + 9
 */
const TIME_SLOT_RANGES: readonly { slot: TimeSlot; startHour: number; endHour: number }[] = [
  { slot: 'morning_rush', startHour: 7, endHour: 9 },
  { slot: 'morning_late', startHour: 9, endHour: 11 },
  { slot: 'afternoon', startHour: 11, endHour: 17 },
  { slot: 'evening_rush', startHour: 17, endHour: 19 },
  { slot: 'evening_late', startHour: 19, endHour: 22 },
  // off_peak: 22:00 - 07:00 (default/fallback)
];

const KST_OFFSET_HOURS = 9;

/**
 * Classify a session start time into a time slot based on KST.
 */
export function classifyTimeSlot(startedAt: Date): TimeSlot {
  const kstHour = getKstHour(startedAt);

  for (const range of TIME_SLOT_RANGES) {
    if (kstHour >= range.startHour && kstHour < range.endHour) {
      return range.slot;
    }
  }

  return 'off_peak';
}

/**
 * Auto-detect the current time slot based on the current time.
 */
export function detectCurrentTimeSlot(): TimeSlot {
  return classifyTimeSlot(new Date());
}

/**
 * Get the KST hour (0-23) from a Date.
 */
function getKstHour(date: Date): number {
  const utcHour = date.getUTCHours();
  return (utcHour + KST_OFFSET_HOURS) % 24;
}
