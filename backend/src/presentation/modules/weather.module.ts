import { Module } from '@nestjs/common';
import { WeatherController } from '../controllers/weather.controller';
import { GetWeatherUseCase } from '@application/use-cases/get-weather.use-case';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres-user.repository';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { DataSource } from 'typeorm';

@Module({
  imports: [DatabaseModule],
  controllers: [WeatherController],
  providers: [
    {
      provide: 'IWeatherApiClient',
      useFactory: () => {
        const apiKey = process.env.WEATHER_API_KEY || '';
        return new WeatherApiClient(apiKey);
      },
    },
    {
      provide: 'IUserRepository',
      useFactory: (dataSource: DataSource) => {
        return new PostgresUserRepository(dataSource);
      },
      inject: [DataSource],
    },
    GetWeatherUseCase,
  ],
})
export class WeatherModule {}
