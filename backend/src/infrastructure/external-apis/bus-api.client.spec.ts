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
});
