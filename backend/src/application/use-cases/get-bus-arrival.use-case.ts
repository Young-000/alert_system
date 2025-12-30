import { Inject, BadRequestException } from '@nestjs/common';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { BusArrival } from '@domain/entities/bus-arrival.entity';

export class GetBusArrivalUseCase {
  constructor(@Inject('IBusApiClient') private busApiClient: IBusApiClient) {}

  async execute(stopId: string): Promise<BusArrival[]> {
    if (!stopId || stopId.trim() === '') {
      throw new BadRequestException('Bus stop ID is required');
    }

    return this.busApiClient.getBusArrival(stopId);
  }
}
