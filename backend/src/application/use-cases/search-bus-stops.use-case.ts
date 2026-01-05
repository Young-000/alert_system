import { Inject } from '@nestjs/common';
import { BusStop } from '@domain/entities/bus-stop.entity';
import { IBusStopApiClient } from '@infrastructure/external-apis/bus-stop-api.client';

export class SearchBusStopsUseCase {
  constructor(
    @Inject('IBusStopApiClient')
    private busStopApiClient: IBusStopApiClient,
  ) {}

  async execute(query: string, limit = 20): Promise<BusStop[]> {
    const normalized = query.trim();
    if (normalized.length < 2) {
      return [];
    }
    return this.busStopApiClient.searchBusStops(normalized, limit);
  }
}
