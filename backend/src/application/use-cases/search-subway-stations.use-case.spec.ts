import { SearchSubwayStationsUseCase } from './search-subway-stations.use-case';
import { ISubwayStationRepository } from '@domain/repositories/subway-station.repository';

describe('SearchSubwayStationsUseCase', () => {
  let useCase: SearchSubwayStationsUseCase;
  let subwayStationRepository: jest.Mocked<ISubwayStationRepository>;

  beforeEach(() => {
    subwayStationRepository = {
      findById: jest.fn(),
      searchByName: jest.fn(),
      saveMany: jest.fn(),
    };
    useCase = new SearchSubwayStationsUseCase(subwayStationRepository);
  });

  it('should search stations by name', async () => {
    subwayStationRepository.searchByName.mockResolvedValue([]);

    await useCase.execute('gangnam');

    expect(subwayStationRepository.searchByName).toHaveBeenCalledWith('gangnam', 20);
  });

  it('should skip short queries', async () => {
    const result = await useCase.execute('g');

    expect(result).toEqual([]);
    expect(subwayStationRepository.searchByName).not.toHaveBeenCalled();
  });
});
