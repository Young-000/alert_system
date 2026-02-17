import { Test, TestingModule } from '@nestjs/testing';
import { SubwayController } from './subway.controller';
import { SearchSubwayStationsUseCase } from '@application/use-cases/search-subway-stations.use-case';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';

describe('SubwayController', () => {
  let controller: SubwayController;
  let searchSubwayStationsUseCase: jest.Mocked<SearchSubwayStationsUseCase>;
  let subwayApiClient: jest.Mocked<ISubwayApiClient>;

  beforeEach(async () => {
    searchSubwayStationsUseCase = { execute: jest.fn() } as any;
    subwayApiClient = { getSubwayArrival: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubwayController],
      providers: [
        { provide: SearchSubwayStationsUseCase, useValue: searchSubwayStationsUseCase },
        { provide: 'ISubwayApiClient', useValue: subwayApiClient },
      ],
    }).compile();

    controller = module.get<SubwayController>(SubwayController);
  });

  describe('search', () => {
    it('검색어로 지하철역 검색 성공', async () => {
      const mockStations = [
        { id: 'st-1', name: '강남역', line: '2호선' },
        { id: 'st-2', name: '강남구청역', line: '7호선' },
      ];
      searchSubwayStationsUseCase.execute.mockResolvedValue(mockStations as any);

      const result = await controller.search('강남');

      expect(searchSubwayStationsUseCase.execute).toHaveBeenCalledWith('강남');
      expect(result).toEqual(mockStations);
    });

    it('빈 검색어 시 빈 문자열로 호출', async () => {
      searchSubwayStationsUseCase.execute.mockResolvedValue([]);

      const result = await controller.search('');

      expect(searchSubwayStationsUseCase.execute).toHaveBeenCalledWith('');
      expect(result).toEqual([]);
    });
  });

  describe('getArrival', () => {
    it('지하철 도착 정보 조회 성공', async () => {
      const mockArrivals = [
        { trainLineNm: '2호선', arvlMsg2: '3분 후 도착' },
      ];
      subwayApiClient.getSubwayArrival.mockResolvedValue(mockArrivals as any);

      const result = await controller.getArrival('강남');

      expect(subwayApiClient.getSubwayArrival).toHaveBeenCalledWith('강남');
      expect(result).toEqual(mockArrivals);
    });

    it('subwayApiClient 미주입 시 빈 배열 반환', async () => {
      const module = await Test.createTestingModule({
        controllers: [SubwayController],
        providers: [
          { provide: SearchSubwayStationsUseCase, useValue: searchSubwayStationsUseCase },
        ],
      }).compile();
      const ctrl = module.get<SubwayController>(SubwayController);

      const result = await ctrl.getArrival('강남');

      expect(result).toEqual([]);
    });

    it('API 에러 시 전파', async () => {
      subwayApiClient.getSubwayArrival.mockRejectedValue(new Error('Subway API Error'));

      await expect(controller.getArrival('강남')).rejects.toThrow('Subway API Error');
    });
  });
});
