import { Module } from '@nestjs/common';
import { BusController } from '../controllers/bus.controller';
import { BusStopApiClient } from '@infrastructure/external-apis/bus-stop-api.client';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';
import { SearchBusStopsUseCase } from '@application/use-cases/search-bus-stops.use-case';

@Module({
  controllers: [BusController],
  providers: [
    {
      provide: 'IBusStopApiClient',
      useFactory: () => {
        return new BusStopApiClient(process.env.SUBWAY_API_KEY);
      },
    },
    {
      provide: 'IBusApiClient',
      useFactory: () => {
        const apiKey = process.env.BUS_API_KEY || '';
        return new BusApiClient(apiKey);
      },
    },
    SearchBusStopsUseCase,
  ],
})
export class BusModule {}
