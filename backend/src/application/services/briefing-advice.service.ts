import { Injectable } from '@nestjs/common';
import {
  BriefingAdviceDto,
  BriefingResponseDto,
  AdviceSeverity,
  AdviceCategory,
} from '@application/dto/briefing.dto';
import {
  WidgetWeatherDto,
  WidgetAirQualityDto,
  WidgetTransitDto,
  WidgetDepartureDataDto,
} from '@application/dto/widget-data.dto';

export type TimeContext = 'morning' | 'evening';

export type BriefingInput = {
  weather: WidgetWeatherDto | null;
  airQuality: WidgetAirQualityDto | null;
  transit: WidgetTransitDto;
  departure: WidgetDepartureDataDto | null;
  timeContext: TimeContext;
};

const SEVERITY_ORDER: Record<AdviceSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

const CATEGORY_ORDER: Record<AdviceCategory, number> = {
  umbrella: 0,
  mask: 1,
  clothing: 2,
  transit: 3,
  temperature: 4,
  wind: 5,
};

const MAX_ADVICES = 4;

@Injectable()
export class BriefingAdviceService {
  generate(input: BriefingInput): BriefingResponseDto {
    const advices: BriefingAdviceDto[] = [];

    if (input.weather) {
      advices.push(...this.generateClothingAdvice(input.weather));
      advices.push(...this.generateUmbrellaAdvice(input.weather));
      advices.push(...this.generateWindAdvice(input.weather));
    }

    if (input.airQuality) {
      advices.push(...this.generateMaskAdvice(input.airQuality));
    }

    advices.push(...this.generateTransitAdvice(input.transit));

    if (input.departure) {
      advices.push(...this.generateDepartureAdvice(input.departure));
    }

    const sorted = this.sortAndLimit(advices);
    const contextLabel = input.timeContext === 'morning' ? '출근 브리핑' : '퇴근 브리핑';
    const summary = this.buildSummary(sorted, input.weather);

    return {
      contextLabel,
      summary,
      advices: sorted,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a single-line briefing text for the widget.
   * Returns the highest-severity advice message, or a weather summary fallback.
   */
  generateWidgetBriefingText(input: BriefingInput): string {
    const response = this.generate(input);
    return response.summary;
  }

  // ─── Clothing Advice ───

  private generateClothingAdvice(weather: WidgetWeatherDto): BriefingAdviceDto[] {
    const advices: BriefingAdviceDto[] = [];
    const temp = this.getEffectiveTemperature(weather);

    const clothing = this.getClothingAdvice(temp);
    advices.push(clothing);

    // Temperature range warning (daily high-low diff >= 10)
    if (weather.maxTemp != null && weather.minTemp != null) {
      const tempDiff = weather.maxTemp - weather.minTemp;
      if (tempDiff >= 10) {
        advices.push({
          category: 'clothing',
          severity: 'warning',
          icon: '🌡️',
          message: `일교차 ${tempDiff}도, 겉옷 챙기세요`,
        });
      }
    }

    return advices;
  }

  private getEffectiveTemperature(weather: WidgetWeatherDto): number {
    // Prefer feels-like temperature if available
    return weather.feelsLike ?? weather.temperature;
  }

  private getClothingAdvice(temp: number): BriefingAdviceDto {
    if (temp <= -10) {
      return {
        category: 'clothing',
        severity: 'danger',
        icon: '🥶',
        message: '패딩 필수, 방한용품 챙기세요',
      };
    }
    if (temp <= 0) {
      return {
        category: 'clothing',
        severity: 'warning',
        icon: '🧥',
        message: '두꺼운 외투 필수',
      };
    }
    if (temp <= 5) {
      return {
        category: 'clothing',
        severity: 'warning',
        icon: '🧥',
        message: '코트나 두꺼운 겉옷',
      };
    }
    if (temp <= 10) {
      return {
        category: 'clothing',
        severity: 'info',
        icon: '🧶',
        message: '자켓 + 니트 추천',
      };
    }
    if (temp <= 15) {
      return {
        category: 'clothing',
        severity: 'info',
        icon: '👔',
        message: '가벼운 겉옷',
      };
    }
    if (temp <= 20) {
      return {
        category: 'clothing',
        severity: 'info',
        icon: '👕',
        message: '긴팔 또는 얇은 겉옷',
      };
    }
    if (temp <= 25) {
      return {
        category: 'clothing',
        severity: 'info',
        icon: '👕',
        message: '반팔 가능, 실내 냉방 주의',
      };
    }
    if (temp <= 28) {
      return {
        category: 'clothing',
        severity: 'info',
        icon: '☀️',
        message: '반팔, 수분 섭취',
      };
    }
    if (temp <= 33) {
      return {
        category: 'clothing',
        severity: 'warning',
        icon: '🥵',
        message: '더위 주의, 수분 섭취 필수',
      };
    }
    return {
      category: 'clothing',
      severity: 'danger',
      icon: '🔥',
      message: '폭염 경보, 외출 자제',
    };
  }

  // ─── Umbrella / Precipitation Advice ───

  private generateUmbrellaAdvice(weather: WidgetWeatherDto): BriefingAdviceDto[] {
    const advices: BriefingAdviceDto[] = [];
    const condition = weather.condition.toLowerCase();

    // Thunderstorm check (highest priority)
    if (condition.includes('thunder')) {
      advices.push({
        category: 'umbrella',
        severity: 'danger',
        icon: '⛈️',
        message: '뇌우 예보, 외출 주의',
      });
      return advices;
    }

    // Snow check
    if (condition.includes('snow')) {
      advices.push({
        category: 'umbrella',
        severity: 'warning',
        icon: '❄️',
        message: '눈 예보, 미끄럼 주의',
      });
      return advices;
    }

    // Rain check (current condition)
    if (this.isRainyCondition(condition)) {
      advices.push({
        category: 'umbrella',
        severity: 'warning',
        icon: '🌂',
        message: '우산 챙기세요',
      });
      return advices;
    }

    // Fog/mist/haze check
    if (condition.includes('mist') || condition.includes('fog') || condition.includes('haze')) {
      advices.push({
        category: 'umbrella',
        severity: 'info',
        icon: '🌫️',
        message: '시야 주의, 안전 운전',
      });
      return advices;
    }

    return advices;
  }

  private isRainyCondition(condition: string): boolean {
    const rainyKeywords = ['rain', 'drizzle', '비', '소나기', '이슬비'];
    return rainyKeywords.some((keyword) => condition.toLowerCase().includes(keyword.toLowerCase()));
  }

  // ─── Wind Advice ───

  private generateWindAdvice(weather: WidgetWeatherDto): BriefingAdviceDto[] {
    const advices: BriefingAdviceDto[] = [];

    // Check if feels-like differs significantly from actual temp
    if (weather.feelsLike != null && weather.temperature - weather.feelsLike >= 5) {
      advices.push({
        category: 'wind',
        severity: 'warning',
        icon: '💨',
        message: `바람이 강해 체감 ${weather.feelsLike}도`,
      });
    }

    return advices;
  }

  // ─── Mask / Air Quality Advice ───

  private generateMaskAdvice(airQuality: WidgetAirQualityDto): BriefingAdviceDto[] {
    const advices: BriefingAdviceDto[] = [];

    // Apply PM2.5 correction: if PM2.5 > 35, bump level up
    let effectiveLevel = airQuality.statusLevel;
    if (airQuality.pm25 > 35 && effectiveLevel === 'moderate') {
      effectiveLevel = 'unhealthy';
    }

    switch (effectiveLevel) {
      case 'good':
        advices.push({
          category: 'mask',
          severity: 'info',
          icon: '😊',
          message: '공기 좋음, 산책하기 좋아요',
        });
        break;
      case 'moderate':
        advices.push({
          category: 'mask',
          severity: 'info',
          icon: '😐',
          message: '미세먼지 보통',
        });
        break;
      case 'unhealthy':
        advices.push({
          category: 'mask',
          severity: 'warning',
          icon: '😷',
          message: '마스크 착용 권장',
        });
        break;
      case 'veryUnhealthy':
        advices.push({
          category: 'mask',
          severity: 'danger',
          icon: '🤢',
          message: '마스크 필수, 실외활동 자제',
        });
        break;
    }

    return advices;
  }

  // ─── Transit Advice ───

  private generateTransitAdvice(transit: WidgetTransitDto): BriefingAdviceDto[] {
    const advices: BriefingAdviceDto[] = [];

    if (transit.subway) {
      const { stationName, arrivalMinutes } = transit.subway;
      if (arrivalMinutes <= 3) {
        advices.push({
          category: 'transit',
          severity: 'warning',
          icon: '🚇',
          message: `${stationName} 곧 도착, 서두르세요`,
        });
      } else {
        advices.push({
          category: 'transit',
          severity: 'info',
          icon: '🚇',
          message: `${stationName} ${arrivalMinutes}분 후 도착`,
        });
      }
    }

    if (transit.bus) {
      const { routeName, arrivalMinutes, remainingStops } = transit.bus;
      if (arrivalMinutes <= 3) {
        advices.push({
          category: 'transit',
          severity: 'warning',
          icon: '🚌',
          message: `${routeName}번 곧 도착`,
        });
      } else {
        advices.push({
          category: 'transit',
          severity: 'info',
          icon: '🚌',
          message: `${routeName}번 ${arrivalMinutes}분 후 (${remainingStops}정거장)`,
        });
      }
    }

    return advices;
  }

  // ─── Departure Advice ───

  private generateDepartureAdvice(departure: WidgetDepartureDataDto): BriefingAdviceDto[] {
    const advices: BriefingAdviceDto[] = [];

    if (departure.minutesUntilDeparture <= 10) {
      advices.push({
        category: 'transit',
        severity: 'warning',
        icon: '⏰',
        message: `출발까지 ${departure.minutesUntilDeparture}분!`,
      });
    }

    if (departure.hasTrafficDelay) {
      advices.push({
        category: 'transit',
        severity: 'warning',
        icon: '🚦',
        message: '교통 지연 감지, 여유 있게 출발하세요',
      });
    }

    return advices;
  }

  // ─── Sorting & Limiting ───

  private sortAndLimit(advices: BriefingAdviceDto[]): BriefingAdviceDto[] {
    return advices
      .sort((a, b) => {
        const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
      })
      .slice(0, MAX_ADVICES);
  }

  // ─── Summary ───

  private buildSummary(advices: BriefingAdviceDto[], weather: WidgetWeatherDto | null): string {
    // Use highest-severity advice message as summary
    if (advices.length > 0) {
      return advices[0].message;
    }

    // Fallback: weather summary
    if (weather) {
      return `${weather.temperature}도 ${weather.conditionKr}`;
    }

    return '좋은 하루 보내세요';
  }

  // ─── Time Context Helper ───

  /**
   * Determines the time context based on the current KST hour.
   * Morning: 4:00 ~ 13:59 (for commute briefing)
   * Evening: 14:00 ~ 3:59 (for return briefing)
   */
  static getTimeContext(): TimeContext {
    const now = new Date();
    const kstOffset = 9 * 60;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const kstMinutes = (utcMinutes + kstOffset) % (24 * 60);
    const kstHour = Math.floor(kstMinutes / 60);

    return kstHour >= 4 && kstHour < 14 ? 'morning' : 'evening';
  }
}
