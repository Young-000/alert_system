import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetBusArrivalUseCase } from '@application/use-cases/get-bus-arrival.use-case';
import { SearchBusStopsUseCase } from '@application/use-cases/search-bus-stops.use-case';

@Controller('bus')
export class BusController {
  constructor(
    private getBusArrivalUseCase: GetBusArrivalUseCase,
    private searchBusStopsUseCase: SearchBusStopsUseCase
  ) {}

  @Get('stops/search')
  async searchStops(@Query('keyword') keyword: string) {
    const stops = await this.searchBusStopsUseCase.execute(keyword);
    return { stops };
  }

  @Get('arrival/:stopId')
  async getArrival(@Param('stopId') stopId: string) {
    return this.getBusArrivalUseCase.execute(stopId);
  }
}
