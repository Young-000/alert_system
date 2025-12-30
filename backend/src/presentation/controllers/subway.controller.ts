import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetSubwayArrivalUseCase } from '@application/use-cases/get-subway-arrival.use-case';
import { SearchSubwayStationsUseCase } from '@application/use-cases/search-subway-stations.use-case';

@Controller('subway')
export class SubwayController {
  constructor(
    private getSubwayArrivalUseCase: GetSubwayArrivalUseCase,
    private searchSubwayStationsUseCase: SearchSubwayStationsUseCase
  ) {}

  @Get('stations/search')
  async searchStations(@Query('keyword') keyword: string) {
    const stations = await this.searchSubwayStationsUseCase.execute(keyword);
    return { stations };
  }

  @Get('arrival/:stationId')
  async getArrival(@Param('stationId') stationId: string) {
    return this.getSubwayArrivalUseCase.execute(stationId);
  }
}
