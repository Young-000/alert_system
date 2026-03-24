import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';
import { WidgetDataService } from '@application/services/widget-data.service';
import { BriefingAdviceService } from '@application/services/briefing-advice.service';
import { BriefingResponseDto } from '@application/dto/briefing.dto';
import {
  WidgetWeatherDto,
  WidgetAirQualityDto,
  WidgetTransitDto,
  WidgetDepartureDataDto,
} from '@application/dto/widget-data.dto';

class BriefingQueryDto {
  lat?: string;
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
@UseGuards(AuthGuard('jwt'))
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
    const parsedLat = query.lat ? parseFloat(query.lat) : undefined;
    const parsedLng = query.lng ? parseFloat(query.lng) : undefined;
    const lat = parsedLat !== undefined && isNaN(parsedLat) ? undefined : parsedLat;
    const lng = parsedLng !== undefined && isNaN(parsedLng) ? undefined : parsedLng;

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
