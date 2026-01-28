import { Controller, Get, Query } from '@nestjs/common';
import { SearchSubwayStationsUseCase } from '@application/use-cases/search-subway-stations.use-case';
import { Public } from '@infrastructure/auth/public.decorator';

@Controller('subway')
@Public()
export class SubwayController {
  constructor(private searchSubwayStationsUseCase: SearchSubwayStationsUseCase) {}

  @Get('stations')
  async search(@Query('query') query = '') {
    return this.searchSubwayStationsUseCase.execute(query);
  }
}
