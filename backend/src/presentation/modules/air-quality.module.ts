import { Module } from '@nestjs/common';
import { AirQualityController } from '../controllers/air-quality.controller';
import { GetAirQualityUseCase } from '@application/use-cases/get-air-quality.use-case';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { AirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';

@Module({
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
      useClass: PostgresUserRepository,
    },
    GetAirQualityUseCase,
  ],
})
export class AirQualityModule {}

