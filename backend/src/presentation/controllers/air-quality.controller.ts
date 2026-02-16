import { Controller, Get, Param, Query, Request, ForbiddenException } from '@nestjs/common';
import { GetAirQualityUseCase } from '@application/use-cases/get-air-quality.use-case';
import { LocationQueryDto } from '@application/dto/location-query.dto';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('air-quality')
export class AirQualityController {
  constructor(private getAirQualityUseCase: GetAirQualityUseCase) {}

  @Get('user/:userId')
  async getByUser(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<AirQuality> {
    if (req.user.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 정보를 조회할 수 없습니다.');
    }
    return this.getAirQualityUseCase.execute(userId);
  }

  @Get('location')
  async getByLocation(@Query() query: LocationQueryDto): Promise<AirQuality> {
    return this.getAirQualityUseCase.executeByLocation(query.lat, query.lng);
  }
}

