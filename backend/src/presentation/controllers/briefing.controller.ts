import { Controller, Get, Query, Request, BadRequestException } from '@nestjs/common';
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

function parseCoordinate(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
): number | undefined {
  if (!value) return undefined;
  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(`Invalid ${name}: must be between ${min} and ${max}`);
  }
  return parsed;
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
    const lat = parseCoordinate(query.lat, 'latitude', -90, 90);
    const lng = parseCoordinate(query.lng, 'longitude', -180, 180);

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
