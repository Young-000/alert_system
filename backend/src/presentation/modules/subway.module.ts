import { Module } from '@nestjs/common';
import { SubwayController } from '../controllers/subway.controller';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { SearchSubwayStationsUseCase } from '@application/use-cases/search-subway-stations.use-case';

@Module({
  controllers: [SubwayController],
  providers: [
    {
      provide: 'ISubwayStationRepository',
      useClass: PostgresSubwayStationRepository,
    },
    {
      provide: 'ISubwayApiClient',
      useFactory: () => {
        const apiKey = process.env.SUBWAY_REALTIME_API_KEY || process.env.SUBWAY_API_KEY || '';
        return new SubwayApiClient(apiKey);
      },
    },
    SearchSubwayStationsUseCase,
  ],
})
export class SubwayModule {}
