import { Controller, Get, Query } from '@nestjs/common';
import { SearchBusStopsUseCase } from '@application/use-cases/search-bus-stops.use-case';
import { Public } from '@infrastructure/auth/public.decorator';

@Controller('bus')
@Public()
export class BusController {
  constructor(private searchBusStopsUseCase: SearchBusStopsUseCase) {}

  @Get('stops')
  async searchStops(@Query('query') query = '') {
    return this.searchBusStopsUseCase.execute(query);
  }
}
