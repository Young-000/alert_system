import { Module } from '@nestjs/common';
import { SubwayController } from '../controllers/subway.controller';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';
import { SearchSubwayStationsUseCase } from '@application/use-cases/search-subway-stations.use-case';

@Module({
  controllers: [SubwayController],
  providers: [
    {
      provide: 'ISubwayStationRepository',
      useClass: PostgresSubwayStationRepository,
    },
    SearchSubwayStationsUseCase,
  ],
})
export class SubwayModule {}
