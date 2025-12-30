import { Module } from '@nestjs/common';
import { BusController } from '../controllers/bus.controller';
import { GetBusArrivalUseCase } from '@application/use-cases/get-bus-arrival.use-case';
import { SearchBusStopsUseCase } from '@application/use-cases/search-bus-stops.use-case';
import { BusApiClient } from '@infrastructure/external-apis/bus-api.client';

@Module({
  controllers: [BusController],
  providers: [
    {
      provide: 'IBusApiClient',
      useFactory: () => {
        const apiKey = process.env.BUS_API_KEY || '';
        return new BusApiClient(apiKey);
      },
    },
    GetBusArrivalUseCase,
    SearchBusStopsUseCase,
  ],
})
export class BusModule {}
