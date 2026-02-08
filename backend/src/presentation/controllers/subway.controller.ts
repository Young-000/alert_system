import { Controller, Get, Query, Param, Inject, Optional } from '@nestjs/common';
import { SearchSubwayStationsUseCase } from '@application/use-cases/search-subway-stations.use-case';
import { Public } from '@infrastructure/auth/public.decorator';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';

@Controller('subway')
@Public()
export class SubwayController {
  constructor(
    private searchSubwayStationsUseCase: SearchSubwayStationsUseCase,
    @Optional()
    @Inject('ISubwayApiClient')
    private readonly subwayApiClient?: ISubwayApiClient,
  ) {}

  @Get('stations')
  async search(@Query('query') query = '') {
    return this.searchSubwayStationsUseCase.execute(query);
  }

  @Get('arrival/:stationName')
  async getArrival(@Param('stationName') stationName: string) {
    if (!this.subwayApiClient) {
      return [];
    }
    return this.subwayApiClient.getSubwayArrival(stationName);
  }
}
