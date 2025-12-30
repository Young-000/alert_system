import { Controller, Get, Param } from '@nestjs/common';
import { GetSubwayArrivalUseCase } from '@application/use-cases/get-subway-arrival.use-case';

@Controller('subway')
export class SubwayController {
  constructor(private getSubwayArrivalUseCase: GetSubwayArrivalUseCase) {}

  @Get('arrival/:stationId')
  async getArrival(@Param('stationId') stationId: string) {
    return this.getSubwayArrivalUseCase.execute(stationId);
  }
}
