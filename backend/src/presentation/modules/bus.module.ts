import { Module } from '@nestjs/common';
import { BusController } from '../controllers/bus.controller';
import { BusStopApiClient } from '@infrastructure/external-apis/bus-stop-api.client';
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
    SearchBusStopsUseCase,
  ],
})
export class BusModule {}
