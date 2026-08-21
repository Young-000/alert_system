import { BusApiClient } from './bus-api.client';
import { BusArrival } from '@domain/entities/bus-arrival.entity';

jest.mock('axios', () => {
  const mockGet = jest.fn();
  const mockCreate = jest.fn(() => ({
    get: mockGet,
  }));
  return {
    create: mockCreate,
    default: {
      create: mockCreate,
    },
    __mockGet: mockGet,
  };
});

describe('BusApiClient', () => {
  let client: BusApiClient;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const axiosMock = jest.requireMock('axios') as any;
    mockGet = axiosMock.__mockGet;
    client = new BusApiClient('test-api-key');
  });

  it('should fetch bus arrival data', async () => {
    const mockResponse = {
      data: {
        msgBody: {
          itemList: [
            {
              stId: 'stop-123',
              busRouteId: 'route-456',
              busRouteNm: '123번',
              arrmsg1: '3분 후 도착',
              arrmsg2: '5분 후 도착',
              staOrd: 10,
            },
          ],
        },
      },
    };
    mockGet.mockResolvedValue(mockResponse);

    const result = await client.getBusArrival('stop-123');

    expect(result).toHaveLength(1);
    expect(result[0].stopId).toBe('stop-123');
    expect(result[0].routeName).toBe('123번');
    expect(mockGet).toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));

    await expect(client.getBusArrival('stop-123')).rejects.toThrow('API Error');
  });

  // 도착 시각의 도메인 단위는 "초"다. 소비자들이 그 계약에 기대고 있다 —
  // notification-message-builder.formatArrivalTime(seconds),
  // widget-data.service(arrivalTime / 60), route-delay-check(shortestArrivalSeconds),
  // send-notification(DELAY_THRESHOLD_SECONDS = 600).
  describe('parseArrivalTime (초 단위 계약)', () => {
    async function arrivalTimeFor(arrmsg1: string): Promise<number> {
      mockGet.mockResolvedValue({
        data: {
          msgBody: {
            itemList: [
              {
                stId: 'stop-123',
                busRouteId: 'route-456',
                busRouteNm: '123번',
                arrmsg1,
                staOrd: 10,
              },
            ],
          },
        },
      });
      const result = await client.getBusArrival('stop-123');
      return result[0].arrivalTime;
    }

    it('converts minutes to seconds', async () => {
      await expect(arrivalTimeFor('3분 후 도착')).resolves.toBe(180);
    });

    it('adds the seconds component when present', async () => {
      // 서울 TOPIS arrmsg1 실제 형식
      await expect(arrivalTimeFor('3분30초후[2번째 전]')).resolves.toBe(210);
    });

    it('returns 0 when no time is given', async () => {
      await expect(arrivalTimeFor('곧 도착[1번째 전]')).resolves.toBe(0);
      await expect(arrivalTimeFor('운행종료')).resolves.toBe(0);
    });

    it('does not read a stop count as a duration', async () => {
      // "[2번째 전]"은 남은 정류장 수지 시간이 아니다
      await expect(arrivalTimeFor('출발대기[2번째 전]')).resolves.toBe(0);
    });
  });
});
