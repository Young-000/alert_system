import { Module } from '@nestjs/common';
import { WeatherController } from '../controllers/weather.controller';
import { WeatherApiClient } from '@infrastructure/external-apis/weather-api.client';

@Module({
  controllers: [WeatherController],
  providers: [
    {
      provide: 'IWeatherApiClient',
      useFactory: () => {
        const apiKey = process.env.AIR_QUALITY_API_KEY || '';
        return new WeatherApiClient(apiKey);
      },
    },
  ],
})
export class WeatherModule {}
