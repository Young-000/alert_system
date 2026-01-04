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
});
