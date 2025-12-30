import { BadRequestException } from '@nestjs/common';
import { GetBusArrivalUseCase } from './get-bus-arrival.use-case';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { BusArrival } from '@domain/entities/bus-arrival.entity';

describe('GetBusArrivalUseCase', () => {
  let useCase: GetBusArrivalUseCase;
  let busApiClient: jest.Mocked<IBusApiClient>;

  beforeEach(() => {
    busApiClient = {
      getBusArrival: jest.fn(),
    };
    useCase = new GetBusArrivalUseCase(busApiClient);
  });

  it('should get bus arrivals by stop id', async () => {
    const busArrivals = [
      new BusArrival('stop-123', 'route-456', '100번', 5, 1),
      new BusArrival('stop-123', 'route-789', '200번', 10, 2),
    ];

    busApiClient.getBusArrival.mockResolvedValue(busArrivals);

    const result = await useCase.execute('stop-123');

    expect(result).toEqual(busArrivals);
    expect(busApiClient.getBusArrival).toHaveBeenCalledWith('stop-123');
  });

  it('should throw BadRequestException if stop id is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow(BadRequestException);
    await expect(useCase.execute('')).rejects.toThrow('Bus stop ID is required');
  });
});
