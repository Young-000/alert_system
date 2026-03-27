import type { TransportItem, Routine } from './types';
import { TRANSPORT_NOTIFY_OFFSET_MIN } from './types';

function safeParseInt(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function parseHHMM(time: string): [number, number] {
  const parts = time.split(':');
  return [safeParseInt(parts[0] ?? ''), safeParseInt(parts[1] ?? '')];
}

export function generateSchedule(
  wantsWeather: boolean,
  wantsTransport: boolean,
  routine: Routine,
): string {
  const times: number[] = [];

  if (wantsWeather) {
    const [h] = parseHHMM(routine.wakeUp);
    times.push(h);
  }

  if (wantsTransport) {
    const [leaveH, leaveM] = parseHHMM(routine.leaveHome);
    let notifyH = leaveH;
    let notifyM = leaveM - TRANSPORT_NOTIFY_OFFSET_MIN;
    if (notifyM < 0) {
      notifyM += 60;
      notifyH -= 1;
    }
    if (notifyH < 0) {
      notifyH = 0;
      notifyM = 0;
    }
    times.push(notifyH);

    const [workH, workM] = parseHHMM(routine.leaveWork);
    let workNotifyH = workH;
    let workNotifyM = workM - TRANSPORT_NOTIFY_OFFSET_MIN;
    if (workNotifyM < 0) {
      workNotifyM += 60;
      workNotifyH -= 1;
    }
    if (workNotifyH < 0) {
      workNotifyH = 0;
      workNotifyM = 0;
    }
    times.push(workNotifyH);
  }

  const uniqueHours = [...new Set(times)].sort((a, b) => a - b);
  return `0 ${uniqueHours.join(',')} * * *`;
}

export function generateAlertName(
  wantsWeather: boolean,
  selectedTransports: readonly TransportItem[],
): string {
  const parts: string[] = [];
  if (selectedTransports.length > 0) {
    parts.push(selectedTransports[0].name);
    if (selectedTransports.length > 1) {
      parts[0] += ` 외 ${selectedTransports.length - 1}곳`;
    }
  }
  if (wantsWeather && selectedTransports.length === 0) {
    parts.push('날씨');
  }
  return parts.length > 0 ? `${parts.join(' ')} 알림` : '출퇴근 알림';
}

export function getNotificationTimes(
  wantsWeather: boolean,
  wantsTransport: boolean,
  routine: Routine,
  selectedTransports: readonly TransportItem[],
): { time: string; content: string }[] {
  const times: { time: string; content: string }[] = [];

  if (wantsWeather) {
    times.push({
      time: routine.wakeUp,
      content: '오늘 날씨 + 미세먼지',
    });
  }

  if (wantsTransport && selectedTransports.length > 0) {
    const [h, m] = parseHHMM(routine.leaveHome);
    let notifyM = m - TRANSPORT_NOTIFY_OFFSET_MIN;
    let notifyH = h;
    if (notifyM < 0) { notifyM += 60; notifyH -= 1; }
    if (notifyH < 0) { notifyH = 0; notifyM = 0; }
    times.push({
      time: `${String(notifyH).padStart(2, '0')}:${String(notifyM).padStart(2, '0')}`,
      content: `출근길 교통 (${selectedTransports.map((t) => t.name).join(', ')})`,
    });

    const [wh, wm] = parseHHMM(routine.leaveWork);
    let workNotifyM = wm - TRANSPORT_NOTIFY_OFFSET_MIN;
    let workNotifyH = wh;
    if (workNotifyM < 0) { workNotifyM += 60; workNotifyH -= 1; }
    if (workNotifyH < 0) { workNotifyH = 0; workNotifyM = 0; }
    times.push({
      time: `${String(workNotifyH).padStart(2, '0')}:${String(workNotifyM).padStart(2, '0')}`,
      content: '퇴근길 교통',
    });
  }

  return times.sort((a, b) => a.time.localeCompare(b.time));
}
