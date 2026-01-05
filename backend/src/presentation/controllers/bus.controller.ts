import { Controller, Get, Query } from '@nestjs/common';
import { SearchBusStopsUseCase } from '@application/use-cases/search-bus-stops.use-case';

@Controller('bus')
export class BusController {
  constructor(private searchBusStopsUseCase: SearchBusStopsUseCase) {}

  @Get('stops')
  async searchStops(@Query('query') query = '') {
    return this.searchBusStopsUseCase.execute(query);
  }
}
