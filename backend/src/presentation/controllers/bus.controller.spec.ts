import { Test, TestingModule } from '@nestjs/testing';
import { BusController } from './bus.controller';
import { SearchBusStopsUseCase } from '@application/use-cases/search-bus-stops.use-case';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';

describe('BusController', () => {
  let controller: BusController;
  let searchBusStopsUseCase: jest.Mocked<SearchBusStopsUseCase>;
  let busApiClient: jest.Mocked<IBusApiClient>;

  beforeEach(async () => {
    searchBusStopsUseCase = { execute: jest.fn() } as any;
    busApiClient = { getBusArrival: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusController],
      providers: [
        { provide: SearchBusStopsUseCase, useValue: searchBusStopsUseCase },
        { provide: 'IBusApiClient', useValue: busApiClient },
      ],
    }).compile();

    controller = module.get<BusController>(BusController);
  });

  describe('searchStops', () => {
    it('검색어로 버스 정류장 검색 성공', async () => {
      const mockStops = [
        { id: 'stop-1', name: '강남역', arsId: '22001' },
      ];
      searchBusStopsUseCase.execute.mockResolvedValue(mockStops as any);

      const result = await controller.searchStops('강남');

      expect(searchBusStopsUseCase.execute).toHaveBeenCalledWith('강남');
      expect(result).toEqual(mockStops);
    });

    it('빈 검색어 시 빈 문자열로 호출', async () => {
      searchBusStopsUseCase.execute.mockResolvedValue([]);

      const result = await controller.searchStops('');

      expect(searchBusStopsUseCase.execute).toHaveBeenCalledWith('');
      expect(result).toEqual([]);
    });
  });

  describe('getArrival', () => {
    it('버스 도착 정보 조회 성공', async () => {
      const mockArrivals = [
        { busRouteNm: '146', arrmsg1: '3분 후 도착' },
      ];
      busApiClient.getBusArrival.mockResolvedValue(mockArrivals as any);

      const result = await controller.getArrival('22001');

      expect(busApiClient.getBusArrival).toHaveBeenCalledWith('22001');
      expect(result).toEqual(mockArrivals);
    });

    it('busApiClient 미주입 시 빈 배열 반환', async () => {
      const module = await Test.createTestingModule({
        controllers: [BusController],
        providers: [
          { provide: SearchBusStopsUseCase, useValue: searchBusStopsUseCase },
        ],
      }).compile();
      const ctrl = module.get<BusController>(BusController);

      const result = await ctrl.getArrival('22001');

      expect(result).toEqual([]);
    });

    it('API 에러 시 전파', async () => {
      busApiClient.getBusArrival.mockRejectedValue(new Error('Bus API Error'));

      await expect(controller.getArrival('22001')).rejects.toThrow('Bus API Error');
    });
  });
});
