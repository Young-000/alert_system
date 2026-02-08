import { Controller, Get, Query, Inject, Optional } from '@nestjs/common';
import { Public } from '@infrastructure/auth/public.decorator';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';

@Controller('weather')
@Public()
export class WeatherController {
  constructor(
    @Optional()
    @Inject('IWeatherApiClient')
    private readonly weatherApiClient?: IWeatherApiClient,
  ) {}

  @Get('current')
  async getCurrent(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    if (!this.weatherApiClient) {
      return { error: 'Weather API not configured' };
    }

    const latitude = parseFloat(lat || '37.5665');
    const longitude = parseFloat(lng || '126.978');

    if (isNaN(latitude) || isNaN(longitude)) {
      return { error: 'Invalid coordinates' };
    }

    return this.weatherApiClient.getWeatherWithForecast(latitude, longitude);
  }
}
