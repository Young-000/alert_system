import { Module } from '@nestjs/common';
import { AirQualityController } from '../controllers/air-quality.controller';
import { GetAirQualityUseCase } from '@application/use-cases/get-air-quality.use-case';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { ExternalApiModule } from './external-api.module';

@Module({
  imports: [ExternalApiModule],
  controllers: [AirQualityController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: PostgresUserRepository,
    },
    GetAirQualityUseCase,
  ],
})
export class AirQualityModule {}
