import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetWeatherUseCase } from '@application/use-cases/get-weather.use-case';

@Controller('weather')
export class WeatherController {
  constructor(private getWeatherUseCase: GetWeatherUseCase) {}

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.getWeatherUseCase.execute(userId);
  }

  @Get('location')
  async getByLocation(
    @Query('lat') lat: string,
    @Query('lng') lng: string
  ) {
    return this.getWeatherUseCase.executeByLocation(
      parseFloat(lat),
      parseFloat(lng)
    );
  }
}
