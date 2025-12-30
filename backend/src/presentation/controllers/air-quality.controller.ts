import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetAirQualityUseCase } from '@application/use-cases/get-air-quality.use-case';

@Controller('air-quality')
export class AirQualityController {
  constructor(private getAirQualityUseCase: GetAirQualityUseCase) {}

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.getAirQualityUseCase.execute(userId);
  }

  @Get('location')
  async getByLocation(
    @Query('lat') lat: string,
    @Query('lng') lng: string
  ) {
    return this.getAirQualityUseCase.executeByLocation(
      parseFloat(lat),
      parseFloat(lng)
    );
  }
}

