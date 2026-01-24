import { Injectable } from '@nestjs/common';
import { NotificationContext } from '@domain/entities/notification-context.entity';
import { Recommendation } from '@domain/entities/recommendation.entity';
import { RulePriority } from '@domain/entities/notification-rule.entity';

export interface ISmartMessageBuilder {
  build(context: NotificationContext, recommendations: Recommendation[]): string;
  buildTitle(context: NotificationContext): string;
}

export const SMART_MESSAGE_BUILDER = Symbol('ISmartMessageBuilder');

@Injectable()
export class SmartMessageBuilder implements ISmartMessageBuilder {
  private readonly WEATHER_TRANSLATIONS: Record<string, string> = {
    'clear': '맑음',
    'clear sky': '맑음',
    'clouds': '흐림',
    'few clouds': '약간 흐림',
    'scattered clouds': '구름 조금',
    'broken clouds': '구름 많음',
    'overcast clouds': '흐림',
    'rain': '비',
    'light rain': '가벼운 비',
    'moderate rain': '비',
    'heavy rain': '폭우',
    'snow': '눈',
    'light snow': '가벼운 눈',
    'thunderstorm': '뇌우',
    'drizzle': '이슬비',
    'mist': '안개',
    'fog': '짙은 안개',
    'haze': '연무',
  };

  build(context: NotificationContext, recommendations: Recommendation[]): string {
    const parts: string[] = [];

    // 1. Basic info (always show)
    const basicInfo = this.buildBasicInfo(context);
    if (basicInfo) {
      parts.push(basicInfo);
    }

    // 2. Transit info
    const transitInfo = this.buildTransitInfo(context);
    if (transitInfo) {
      parts.push(transitInfo);
    }

    // 3. Smart recommendations (top 2 high-priority ones)
    const topRecommendations = recommendations
      .filter(r => r.priority >= RulePriority.HIGH)
      .slice(0, 2);

    if (topRecommendations.length > 0) {
      const recommendationMessages = topRecommendations.map(r => r.message);
      parts.push(recommendationMessages.join('\n'));
    }

    // If no parts, return default message
    if (parts.length === 0) {
      return '오늘도 좋은 하루 되세요!';
    }

    return parts.join('\n\n');
  }

  buildTitle(_context: NotificationContext): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return '☀️ 출근 알림';
    } else if (hour >= 12 && hour < 18) {
      return '🌤️ 오후 알림';
    } else {
      return '🌙 퇴근 알림';
    }
  }

  private buildBasicInfo(context: NotificationContext): string | null {
    const infoParts: string[] = [];

    // Weather
    if (context.weather) {
      const condition = this.translateCondition(context.weather.condition);
      infoParts.push(`${condition} ${context.weather.temperature}°C`);
    }

    // Air quality
    if (context.airQuality) {
      const airStatus = this.getAirQualityEmoji(context.airQuality.status);
      infoParts.push(`미세먼지 ${airStatus}`);
    }

    return infoParts.length > 0 ? infoParts.join(' · ') : null;
  }

  private buildTransitInfo(context: NotificationContext): string | null {
    const { busArrivals, subwayArrivals, subwayStationName, busStopName } = context;

    if (!busArrivals?.length && !subwayArrivals?.length) {
      return null;
    }

    const transitParts: string[] = [];

    // Transit comparison if both are available
    if (busArrivals?.length && subwayArrivals?.length) {
      const fastestBus = busArrivals[0].arrivalTime;
      const fastestSubway = subwayArrivals[0].arrivalTime;
      const diff = Math.abs(fastestBus - fastestSubway);

      if (diff > 2) {
        const faster = fastestBus < fastestSubway ? '버스' : '지하철';
        const slower = fastestBus < fastestSubway ? '지하철' : '버스';
        transitParts.push(`🚦 오늘은 ${faster}가 ${slower}보다 ${diff}분 빨라요!`);
      }
    }

    // Individual transit info
    if (subwayArrivals?.length) {
      const first = subwayArrivals[0];
      const stationLabel = subwayStationName || '지하철';
      transitParts.push(`🚇 ${stationLabel} ${first.arrivalTime}분 후 (${first.destination}행)`);
    }

    if (busArrivals?.length) {
      const first = busArrivals[0];
      const stopLabel = busStopName || '';
      transitParts.push(`🚌 ${first.routeName}번 ${first.arrivalTime}분 후${stopLabel ? ` (${stopLabel})` : ''}`);
    }

    return transitParts.length > 0 ? transitParts.join('\n') : null;
  }

  private translateCondition(condition: string): string {
    const lowerCondition = condition.toLowerCase();
    return this.WEATHER_TRANSLATIONS[lowerCondition] || condition;
  }

  private getAirQualityEmoji(status: string): string {
    const statusMap: Record<string, string> = {
      'good': '😆 좋음',
      'moderate': '😊 보통',
      'unhealthy for sensitive': '😐 민감군 주의',
      'unhealthy for sensitive groups': '😐 민감군 주의',
      'unhealthy': '😷 나쁨',
      'very unhealthy': '🤢 매우나쁨',
      'hazardous': '🤢 위험',
    };

    const lowerStatus = status.toLowerCase();
    return statusMap[lowerStatus] || status;
  }
}
