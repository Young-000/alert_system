import { Controller, Get, Query, Inject, Optional } from '@nestjs/common';
import { Public } from '@infrastructure/auth/public.decorator';
import { IWeatherApiClient } from '@infrastructure/external-apis/weather-api.client';
import { parseCoordinate, MAX_LATITUDE, MAX_LONGITUDE } from '../utils/query-param';

/** 좌표 미지정 시 기본 위치 — 서울시청 */
const SEOUL_LATITUDE = 37.5665;
const SEOUL_LONGITUDE = 126.978;

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

    // parseFloat만으로는 `?lat=999`가 통과해 지구 밖 좌표가 그대로 외부 기상 API로 나간다.
    // 이 엔드포인트는 @Public이라 인증 없이 호출되므로 범위 검사를 여기서 끝낸다.
    const latitude = lat ? parseCoordinate(lat, MAX_LATITUDE) : SEOUL_LATITUDE;
    const longitude = lng ? parseCoordinate(lng, MAX_LONGITUDE) : SEOUL_LONGITUDE;

    if (latitude === undefined || longitude === undefined) {
      return { error: 'Invalid coordinates' };
    }

    return this.weatherApiClient.getWeatherWithForecast(latitude, longitude);
  }
}
