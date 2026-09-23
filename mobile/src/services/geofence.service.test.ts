import { beforeEach, describe, expect, it, vi } from 'vitest';

import { geofenceService } from './geofence.service';

import type { RecordCommuteEventDto } from '@/types/commute-event';

/**
 * 오프라인 큐의 저장 키. `geofence.service`가 내부 상수로 들고 있어 import할 수
 * 없으므로 리터럴로 맞춘다 — 값이 바뀌면 이 테스트가 큐를 못 찾아 빨개진다.
 */
const OFFLINE_QUEUE_KEY = '@geofence_offline_queue';

/**
 * AsyncStorage를 메모리 Map으로 대체한다. `vi.mock`은 import보다 먼저 끌어올려지므로
 * 팩토리가 참조할 값은 `vi.hoisted`로 같이 올려야 한다.
 */
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string): Promise<string | null> => store.get(key) ?? null,
    setItem: async (key: string, value: string): Promise<void> => {
      store.set(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      store.delete(key);
    },
  },
}));

// expo 네이티브 모듈은 node 환경에 없다. 여기서 검증하는 건 큐 회계뿐이라
// import가 깨지지 않을 만큼만 채운다.
vi.mock('expo-location', () => ({
  GeofencingEventType: { Enter: 1, Exit: 2 },
  startGeofencingAsync: vi.fn(),
  stopGeofencingAsync: vi.fn(),
}));

vi.mock('expo-task-manager', () => ({
  isTaskDefined: vi.fn(() => true),
  isTaskRegisteredAsync: vi.fn(async () => false),
  defineTask: vi.fn(),
}));

const { batchUpload } = vi.hoisted(() => ({ batchUpload: vi.fn() }));

vi.mock('./commute-event.service', () => ({
  commuteEventService: { batchUpload, recordEvent: vi.fn() },
}));

function event(triggeredAt: string, placeId = 'place-1'): RecordCommuteEventDto {
  return {
    placeId,
    eventType: 'exit',
    triggeredAt,
    latitude: 37.5,
    longitude: 127,
  };
}

function seedQueue(events: RecordCommuteEventDto[]): void {
  store.set(OFFLINE_QUEUE_KEY, JSON.stringify(events));
}

function readQueue(): RecordCommuteEventDto[] {
  const raw = store.get(OFFLINE_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as RecordCommuteEventDto[]) : [];
}

describe('geofenceService.syncOfflineEvents 큐 회계', () => {
  beforeEach(() => {
    store.clear();
    batchUpload.mockReset();
  });

  it('업로드 중에 새로 쌓인 이벤트를 지우지 않는다', async () => {
    const queued = event('2026-09-23T00:00:00.000Z');
    seedQueue([queued]);

    // 업로드가 네트워크를 기다리는 동안 백그라운드 지오펜스 태스크가 큐에 적재하는
    // 상황이다(`defineGeofenceTask`의 addToOfflineQueue). 전송 실패 시에만 쌓이므로
    // 이 이벤트는 아직 서버에 올라간 적이 없다.
    const arrivedDuringUpload = event('2026-09-23T00:05:00.000Z', 'place-2');
    batchUpload.mockImplementation(async () => {
      seedQueue([...readQueue(), arrivedDuringUpload]);
      return { processed: 1, ignored: 0, failed: 0, results: [], failures: [] };
    });

    await geofenceService.syncOfflineEvents();

    // 큐 전체를 removeItem하면 이 이벤트는 업로드된 적 없이 사라진다.
    // 출근 exit 하나가 유실되면 그날 자동 세션 자체가 만들어지지 않는다.
    expect(readQueue()).toEqual([arrivedDuringUpload]);
  });

  it('일부 배치가 실패해도 이미 올라간 배치는 큐에서 뺀다', async () => {
    // 배치 크기는 50이다 → 60건이면 배치 2개.
    const events = Array.from({ length: 60 }, (_, i) =>
      event(`2026-09-23T00:${String(i).padStart(2, '0')}:00.000Z`),
    );
    seedQueue(events);

    batchUpload
      .mockResolvedValueOnce({ processed: 50, ignored: 0, failed: 0, results: [], failures: [] })
      .mockRejectedValueOnce(new Error('network down'));

    await geofenceService.syncOfflineEvents();

    // 올라간 50건을 큐에 남기면 다음 동기화가 그대로 다시 올린다. 오프라인 큐의
    // 이벤트는 triggeredAt이 이미 오래됐으므로 서버의 5분 디바운스
    // (`findRecent`: triggeredAt >= now-5m)에 걸리지 않고 재처리된다.
    expect(readQueue()).toEqual(events.slice(50));
  });
});
