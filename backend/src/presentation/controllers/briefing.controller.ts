import { Controller, Get, Query, Request } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';
import {
  MAX_LATITUDE,
  MAX_LONGITUDE,
  parseCoordinate,
} from '../utils/query-param';
import { WidgetDataService } from '@application/services/widget-data.service';
import { BriefingAdviceService } from '@application/services/briefing-advice.service';
import { BriefingResponseDto } from '@application/dto/briefing.dto';
import {
  WidgetWeatherDto,
  WidgetAirQualityDto,
  WidgetTransitDto,
  WidgetDepartureDataDto,
} from '@application/dto/widget-data.dto';

/**
 * 검증 데코레이터가 없는 필드는 전역 ValidationPipe(`whitelist` +
 * `forbidNonWhitelisted`, main.ts:63-72)에서 "정의되지 않은 속성"으로 취급돼
 * 요청 전체가 400이 된다. 좌표 형식 자체는 아래 parseCoordinate가 판정하므로
 * 여기서는 화이트리스트 등록만 한다.
 */
class BriefingQueryDto {
  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lng?: string;
}

type BriefingEndpointResponse = {
  advices: BriefingResponseDto['advices'];
  weather: WidgetWeatherDto | null;
  airQuality: WidgetAirQualityDto | null;
  transit: WidgetTransitDto;
  departure: WidgetDepartureDataDto | null;
  contextLabel: string;
  summary: string;
  updatedAt: string;
};

@Controller('briefing')
export class BriefingController {
  constructor(
    private readonly widgetDataService: WidgetDataService,
    private readonly briefingAdviceService: BriefingAdviceService,
  ) {}

  @Get()
  async getBriefing(
    @Query() query: BriefingQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<BriefingEndpointResponse> {
    // 잘못된 lat/lng(?lat=abc, ?lat=999)는 undefined로 폴백 — 서비스가 기본 좌표를 쓴다
    const lat = parseCoordinate(query.lat, MAX_LATITUDE);
    const lng = parseCoordinate(query.lng, MAX_LONGITUDE);

    const widgetData = await this.widgetDataService.getData(
      req.user.userId,
      lat,
      lng,
    );

    const timeContext = BriefingAdviceService.getTimeContext();

    const briefing = this.briefingAdviceService.generate({
      weather: widgetData.weather,
      airQuality: widgetData.airQuality,
      transit: widgetData.transit,
      departure: widgetData.departure,
      timeContext,
    });

    return {
      advices: briefing.advices,
      weather: widgetData.weather,
      airQuality: widgetData.airQuality,
      transit: widgetData.transit,
      departure: widgetData.departure,
      contextLabel: briefing.contextLabel,
      summary: briefing.summary,
      updatedAt: briefing.updatedAt,
    };
  }
}
