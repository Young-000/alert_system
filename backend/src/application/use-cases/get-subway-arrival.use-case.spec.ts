import { BadRequestException } from '@nestjs/common';
import { GetSubwayArrivalUseCase } from './get-subway-arrival.use-case';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';

describe('GetSubwayArrivalUseCase', () => {
  let useCase: GetSubwayArrivalUseCase;
  let subwayApiClient: jest.Mocked<ISubwayApiClient>;

  beforeEach(() => {
    subwayApiClient = {
      getSubwayArrival: jest.fn(),
    };
    useCase = new GetSubwayArrivalUseCase(subwayApiClient);
  });

  it('should get subway arrivals by station id', async () => {
    const subwayArrivals = [
      new SubwayArrival('station-123', 'line-2', '상행', 3, '강남역'),
      new SubwayArrival('station-123', 'line-2', '하행', 5, '역삼역'),
    ];

    subwayApiClient.getSubwayArrival.mockResolvedValue(subwayArrivals);

    const result = await useCase.execute('station-123');

    expect(result).toEqual(subwayArrivals);
    expect(subwayApiClient.getSubwayArrival).toHaveBeenCalledWith('station-123');
  });

  it('should throw BadRequestException if station id is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow(BadRequestException);
    await expect(useCase.execute('')).rejects.toThrow('Subway station ID is required');
  });
});
