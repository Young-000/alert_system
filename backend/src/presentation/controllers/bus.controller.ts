import { Controller, Get, Query, Param, Inject, Optional } from '@nestjs/common';
import { SearchBusStopsUseCase } from '@application/use-cases/search-bus-stops.use-case';
import { Public } from '@infrastructure/auth/public.decorator';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';

@Controller('bus')
@Public()
export class BusController {
  constructor(
    private searchBusStopsUseCase: SearchBusStopsUseCase,
    @Optional()
    @Inject('IBusApiClient')
    private readonly busApiClient?: IBusApiClient,
  ) {}

  @Get('stops')
  async searchStops(@Query('query') query = '') {
    return this.searchBusStopsUseCase.execute(query);
  }

  @Get('arrival/:stopId')
  async getArrival(@Param('stopId') stopId: string) {
    if (!this.busApiClient) {
      return [];
    }
    return this.busApiClient.getBusArrival(stopId);
  }
}
