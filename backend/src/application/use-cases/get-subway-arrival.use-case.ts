import { Inject, BadRequestException } from '@nestjs/common';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';

export class GetSubwayArrivalUseCase {
  constructor(@Inject('ISubwayApiClient') private subwayApiClient: ISubwayApiClient) {}

  async execute(stationId: string): Promise<SubwayArrival[]> {
    if (!stationId || stationId.trim() === '') {
      throw new BadRequestException('Subway station ID is required');
    }

    return this.subwayApiClient.getSubwayArrival(stationId);
  }
}
