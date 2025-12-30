import { Controller, Get, Param } from '@nestjs/common';
import { GetBusArrivalUseCase } from '@application/use-cases/get-bus-arrival.use-case';

@Controller('bus')
export class BusController {
  constructor(private getBusArrivalUseCase: GetBusArrivalUseCase) {}

  @Get('arrival/:stopId')
  async getArrival(@Param('stopId') stopId: string) {
    return this.getBusArrivalUseCase.execute(stopId);
  }
}
