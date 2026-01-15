import { SearchBusStopsUseCase } from './search-bus-stops.use-case';
import { IBusStopApiClient } from '@infrastructure/external-apis/bus-stop-api.client';
import { BusStop } from '@domain/entities/bus-stop.entity';

describe('SearchBusStopsUseCase', () => {
  let useCase: SearchBusStopsUseCase;
  let mockBusStopApiClient: jest.Mocked<IBusStopApiClient>;

  const mockBusStops: BusStop[] = [
    new BusStop('23-456', '강남역', 'node-1', '일반', 127.027, 37.498, 'stop-1'),
    new BusStop('23-457', '강남역 4번출구', 'node-2', '일반', 127.028, 37.497, 'stop-2'),
  ];

  beforeEach(() => {
    mockBusStopApiClient = {
      searchBusStops: jest.fn(),
    };

    useCase = new SearchBusStopsUseCase(mockBusStopApiClient);
  });

  describe('execute', () => {
    it('2글자 이상 검색어로 버스 정류장 검색', async () => {
      mockBusStopApiClient.searchBusStops.mockResolvedValue(mockBusStops);

      const result = await useCase.execute('강남역');

      expect(result).toEqual(mockBusStops);
      expect(mockBusStopApiClient.searchBusStops).toHaveBeenCalledWith(
        '강남역',
        20,
      );
    });

    it('1글자 검색어는 빈 배열 반환', async () => {
      const result = await useCase.execute('강');

      expect(result).toEqual([]);
      expect(mockBusStopApiClient.searchBusStops).not.toHaveBeenCalled();
    });

    it('빈 검색어는 빈 배열 반환', async () => {
      const result = await useCase.execute('');

      expect(result).toEqual([]);
      expect(mockBusStopApiClient.searchBusStops).not.toHaveBeenCalled();
    });

    it('공백만 있는 검색어는 빈 배열 반환', async () => {
      const result = await useCase.execute('   ');

      expect(result).toEqual([]);
      expect(mockBusStopApiClient.searchBusStops).not.toHaveBeenCalled();
    });

    it('앞뒤 공백은 제거하고 검색', async () => {
      mockBusStopApiClient.searchBusStops.mockResolvedValue(mockBusStops);

      const result = await useCase.execute('  강남역  ');

      expect(result).toEqual(mockBusStops);
      expect(mockBusStopApiClient.searchBusStops).toHaveBeenCalledWith(
        '강남역',
        20,
      );
    });

    it('커스텀 limit 파라미터 전달', async () => {
      mockBusStopApiClient.searchBusStops.mockResolvedValue([mockBusStops[0]]);

      const result = await useCase.execute('강남역', 5);

      expect(result).toHaveLength(1);
      expect(mockBusStopApiClient.searchBusStops).toHaveBeenCalledWith(
        '강남역',
        5,
      );
    });

    it('API 에러 발생 시 예외 전파', async () => {
      mockBusStopApiClient.searchBusStops.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(useCase.execute('강남역')).rejects.toThrow('API Error');
    });
  });
});
