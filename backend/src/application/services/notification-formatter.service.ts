import { Injectable } from '@nestjs/common';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { AlertType } from '@domain/entities/alert.entity';

export interface NotificationData {
  weather?: Weather;
  airQuality?: AirQuality;
  bus?: BusArrival[];
  subway?: SubwayArrival[];
}

@Injectable()
export class NotificationFormatterService {
  formatTitle(alertName: string): string {
    return `📢 ${alertName}`;
  }

  formatBody(data: NotificationData, alertTypes: AlertType[]): string {
    const parts: string[] = [];

    if (alertTypes.includes(AlertType.WEATHER) && data.weather) {
      parts.push(this.formatWeather(data.weather));
    }

    if (alertTypes.includes(AlertType.AIR_QUALITY) && data.airQuality) {
      parts.push(this.formatAirQuality(data.airQuality));
    }

    if (alertTypes.includes(AlertType.BUS) && data.bus && data.bus.length > 0) {
      parts.push(this.formatBus(data.bus));
    }

    if (alertTypes.includes(AlertType.SUBWAY) && data.subway && data.subway.length > 0) {
      parts.push(this.formatSubway(data.subway));
    }

    return parts.join('\n\n');
  }

  private formatWeather(weather: Weather): string {
    const icon = this.getWeatherIcon(weather.condition);
    return `🌤️ 날씨
${icon} ${Math.round(weather.temperature)}°C ${weather.condition}
습도 ${weather.humidity}% | 풍속 ${weather.windSpeed}km/h
📍 ${weather.location}`;
  }

  private formatAirQuality(airQuality: AirQuality): string {
    const statusEmoji = this.getAirQualityEmoji(airQuality.status);
    return `🟢 미세먼지
${statusEmoji} ${airQuality.status}
PM10: ${airQuality.pm10}㎍/㎥ | PM2.5: ${airQuality.pm25}㎍/㎥
AQI: ${airQuality.aqi}
📍 ${airQuality.location}`;
  }

  private formatBus(busArrivals: BusArrival[]): string {
    const lines = ['🚌 버스 도착 정보'];
    // 그룹화: stopId별로 그룹화
    const grouped = busArrivals.reduce((acc, arrival) => {
      const key = arrival.stopId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(arrival);
      return acc;
    }, {} as Record<string, BusArrival[]>);

    Object.values(grouped).forEach((group) => {
      const first = group[0];
      lines.push(`\n${first.routeName}번`);
      group.forEach((arrival, index) => {
        if (index < 2) {
          lines.push(`  ${index + 1}번째: ${arrival.arrivalTime}분 후`);
        }
      });
      lines.push(`📍 정류장 ID: ${first.stopId}`);
    });
    return lines.join('\n');
  }

  private formatSubway(subwayArrivals: SubwayArrival[]): string {
    const lines = ['🚇 지하철 도착 정보'];
    // 그룹화: stationId별로 그룹화
    const grouped = subwayArrivals.reduce((acc, arrival) => {
      const key = arrival.stationId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(arrival);
      return acc;
    }, {} as Record<string, SubwayArrival[]>);

    Object.values(grouped).forEach((group) => {
      const first = group[0];
      lines.push(`\n${first.lineId}호선`);
      group.forEach((arrival, index) => {
        if (index < 2) {
          lines.push(`  ${index + 1}번째: ${arrival.arrivalTime}분 후`);
          lines.push(`    → ${arrival.destination}행`);
        }
      });
      lines.push(`📍 역 ID: ${first.stationId}`);
    });
    return lines.join('\n');
  }

  private getWeatherIcon(condition: string): string {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('clear') || conditionLower.includes('맑음')) return '☀️';
    if (conditionLower.includes('cloud')) return '☁️';
    if (conditionLower.includes('rain')) return '🌧️';
    if (conditionLower.includes('snow')) return '❄️';
    return '🌤️';
  }

  private getAirQualityEmoji(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('good') || statusLower.includes('좋음')) return '🟢';
    if (statusLower.includes('moderate') || statusLower.includes('보통')) return '🟡';
    if (statusLower.includes('unhealthy') || statusLower.includes('나쁨')) return '🟠';
    return '🔴';
  }
}
