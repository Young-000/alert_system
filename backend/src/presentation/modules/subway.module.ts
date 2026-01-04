import { Module } from '@nestjs/common';
import { SubwayController } from '../controllers/subway.controller';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';
import { SearchSubwayStationsUseCase } from '@application/use-cases/search-subway-stations.use-case';
import { DataSource } from 'typeorm';

@Module({
  imports: [DatabaseModule],
  controllers: [SubwayController],
  providers: [
    {
      provide: 'ISubwayStationRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresSubwayStationRepository(dataSource);
      },
      inject: [DataSource],
    },
    SearchSubwayStationsUseCase,
  ],
})
export class SubwayModule {}
