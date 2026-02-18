import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { BriefingResponseDto } from './briefing.dto';

export class WidgetDataQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => parseFloat(value))
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => parseFloat(value))
  lng?: number;
}

export class WidgetWeatherDto {
  temperature: number;
  condition: string;
  conditionEmoji: string;
  conditionKr: string;
  feelsLike?: number;
  maxTemp?: number;
  minTemp?: number;
}

export class WidgetAirQualityDto {
  pm10: number;
  pm25: number;
  status: string;
  statusLevel: 'good' | 'moderate' | 'unhealthy' | 'veryUnhealthy';
}

export class WidgetNextAlertDto {
  time: string;
  label: string;
  alertTypes: string[];
}

export class WidgetSubwayDto {
  stationName: string;
  lineInfo: string;
  arrivalMinutes: number;
  destination: string;
}

export class WidgetBusDto {
  stopName: string;
  routeName: string;
  arrivalMinutes: number;
  remainingStops: number;
}

export class WidgetTransitDto {
  subway: WidgetSubwayDto | null;
  bus: WidgetBusDto | null;
}

export class WidgetDepartureDataDto {
  departureType: 'commute' | 'return';
  optimalDepartureAt: string;
  minutesUntilDeparture: number;
  estimatedTravelMin: number;
  arrivalTarget: string;
  status: string;
  hasTrafficDelay: boolean;
}

export class WidgetDataResponseDto {
  weather: WidgetWeatherDto | null;
  airQuality: WidgetAirQualityDto | null;
  nextAlert: WidgetNextAlertDto | null;
  transit: WidgetTransitDto;
  departure: WidgetDepartureDataDto | null;
  briefing: BriefingResponseDto | null;
  updatedAt: string;
}
