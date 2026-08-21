import { SubwayApiClient } from './subway-api.client';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';

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

describe('SubwayApiClient', () => {
  let client: SubwayApiClient;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const axiosMock = jest.requireMock('axios') as any;
    mockGet = axiosMock.__mockGet;
    client = new SubwayApiClient('test-api-key');
  });

  it('should fetch subway arrival data', async () => {
    const mockResponse = {
      data: {
        realtimeArrivalList: [
          {
            statnId: 'station-123',
            subwayId: '1001',
            updnLine: '상행',
            arvlMsg2: '3분 후 도착',
            trainLineNm: '1호선',
            bstatnNm: '종점역',
          },
        ],
      },
    };
    mockGet.mockResolvedValue(mockResponse);

    const result = await client.getSubwayArrival('station-123');

    expect(result).toHaveLength(1);
    expect(result[0].stationId).toBe('station-123');
    expect(result[0].lineId).toBe('1001');
    expect(mockGet).toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));

    await expect(client.getSubwayArrival('station-123')).rejects.toThrow('API Error');
  });

  // 도착 시각의 도메인 단위는 "초"다 (bus-api.client.spec.ts의 같은 블록 참고).
  describe('parseArrivalTime (초 단위 계약)', () => {
    async function arrivalTimeFor(arvlMsg2: string): Promise<number> {
      mockGet.mockResolvedValue({
        data: {
          realtimeArrivalList: [
            {
              statnId: 'station-123',
              subwayId: '1001',
              updnLine: '상행',
              arvlMsg2,
              bstatnNm: '종점역',
            },
          ],
        },
      });
      const result = await client.getSubwayArrival('station-123');
      return result[0].arrivalTime;
    }

    it('converts minutes to seconds', async () => {
      await expect(arrivalTimeFor('3분 후 도착')).resolves.toBe(180);
    });

    it('adds the seconds component when present', async () => {
      // 서울 지하철 arvlMsg2 실제 형식
      await expect(arrivalTimeFor('6분 30초 후 (수유)')).resolves.toBe(390);
    });

    it('returns 0 when no time is given', async () => {
      await expect(arrivalTimeFor('곧 도착')).resolves.toBe(0);
      await expect(arrivalTimeFor('전역 진입')).resolves.toBe(0);
      await expect(arrivalTimeFor('당역 도착')).resolves.toBe(0);
    });

    it('does not read a stop count as a duration', async () => {
      // "[3]번째 전역"은 남은 역 수지 시간이 아니다
      await expect(arrivalTimeFor('[3]번째 전역 (서초)')).resolves.toBe(0);
    });
  });
});
