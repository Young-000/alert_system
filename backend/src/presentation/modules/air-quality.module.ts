import { Module } from '@nestjs/common';
import { AirQualityController } from '../controllers/air-quality.controller';
import { GetAirQualityUseCase } from '@application/use-cases/get-air-quality.use-case';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { DataSource } from 'typeorm';

@Module({
  imports: [DatabaseModule],
  controllers: [AirQualityController],
  providers: [
    {
      provide: 'IAirQualityApiClient',
      useFactory: () => {
        const apiKey = process.env.AIR_QUALITY_API_KEY || '';
        return new AirQualityApiClient(apiKey);
      },
    },
    {
      provide: 'IUserRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresUserRepository(dataSource);
      },
      inject: [DataSource],
    },
    GetAirQualityUseCase,
  ],
})
export class AirQualityModule {}

