import { Injectable } from '@nestjs/common';
import { Weather, HourlyForecast } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { CommuteRoute } from '@domain/entities/commute-route.entity';
import { RouteScoreDto } from '@application/dto/route-recommendation.dto';
import {
  WeatherAlertVariables,
  TransitAlertVariables,
  CombinedAlertVariables,
  LegacyWeatherVariables,
} from '@infrastructure/messaging/solapi.service';

export interface NotificationData {
  weather?: Weather;
  airQuality?: AirQuality;
  busArrivals?: BusArrival[];
  subwayArrivals?: SubwayArrival[];
  subwayStations?: Array<{ name: string; line: string; arrivals: SubwayArrival[] }>;
  busStops?: Array<{ name: string; arrivals: BusArrival[] }>;
  recommendations?: unknown[];
  linkedRoute?: CommuteRoute;
  routeRecommendation?: RouteScoreDto;
}

@Injectable()
export class NotificationMessageBuilderService {
  buildWeatherVariables(userName: string, data: NotificationData): WeatherAlertVariables {
    const weather = data.weather!;
    const airQuality = data.airQuality;
    const forecast = weather.forecast;

    const now = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return {
      userName,
      date: `${now.getMonth() + 1}월 ${now.getDate()}일 ${dayNames[now.getDay()]}요일`,
      currentTemp: `${Math.round(weather.temperature)}`,
      minTemp: forecast ? `${forecast.minTemp}` : `${Math.round(weather.temperature - 5)}`,
      weather: this.buildWeatherString(weather),
      airQuality: this.buildAirQualityString(airQuality),
      tip: this.generateTip(data),
    };
  }

  buildTransitVariables(userName: string, data: NotificationData): TransitAlertVariables {
    return {
      userName,
      subwayInfo: this.buildSubwayInfo(data.subwayStations),
      busInfo: this.buildBusInfo(data.busStops),
      tip: this.generateTransitTip(data),
    };
  }

  buildCombinedVariables(userName: string, data: NotificationData): CombinedAlertVariables {
    const weather = data.weather!;
    const forecast = weather.forecast;
    const now = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return {
      userName,
      date: `${now.getMonth() + 1}월 ${now.getDate()}일 ${dayNames[now.getDay()]}요일`,
      currentTemp: `${Math.round(weather.temperature)}`,
      minTemp: forecast ? `${forecast.minTemp}` : `${Math.round(weather.temperature - 5)}`,
      weather: this.buildWeatherString(weather),
      airQuality: data.airQuality?.status || '정보 없음',
      subwayInfo: this.buildSubwayInfo(data.subwayStations),
      busInfo: this.buildBusInfo(data.busStops),
      tip: this.generateTip(data),
    };
  }

  buildLegacyVariables(userName: string, data: NotificationData): LegacyWeatherVariables {
    const weather = data.weather;
    const airQuality = data.airQuality;

    return {
      userName,
      temperature: weather ? `${Math.round(weather.temperature)}` : '-',
      condition: weather?.conditionKr || '정보 없음',
      airLevel: airQuality?.status || '정보 없음',
      humidity: weather ? `${weather.humidity}` : '-',
      tip: this.generateTip(data),
    };
  }

  buildSummary(data: NotificationData): string {
    const parts: string[] = [];
    if (data.weather) parts.push(`${Math.round(data.weather.temperature)}° ${data.weather.conditionKr}`);
    if (data.airQuality) parts.push(`미세먼지 ${data.airQuality.status}`);
    if (data.subwayStations?.length) parts.push(`지하철 ${data.subwayStations.map(s => s.name).join(',')}`);
    if (data.busStops?.length) parts.push(`버스 ${data.busStops.length}개 정류장`);
    return parts.join(' | ') || '알림 발송';
  }

  // 날씨 문자열: "오전 맑음 → 오후 비(60%) → 저녁 흐림"
  buildWeatherString(weather: Weather): string {
    const forecast = weather.forecast;
    if (!forecast?.hourlyForecasts?.length) {
      return weather.conditionKr;
    }

    const slots = this.extractTimeSlotsWithRain(forecast.hourlyForecasts);
    return slots.map(s => {
      if (s.rainProbability > 0 && this.isRainyCondition(s.weather)) {
        return `${s.slot} ${s.weather}(${s.rainProbability}%)`;
      }
      return `${s.slot} ${s.weather}`;
    }).join(' → ');
  }

  isRainyCondition(condition: string): boolean {
    const rainyKeywords = ['비', '눈', '소나기', '뇌우', '이슬비', 'rain', 'snow', 'drizzle'];
    return rainyKeywords.some(keyword => condition.toLowerCase().includes(keyword.toLowerCase()));
  }

  buildWeatherHighlights(weather: Weather, airQuality?: AirQuality): string[] {
    const highlights: string[] = [];
    const forecast = weather.forecast;

    if (forecast?.hourlyForecasts?.length) {
      const rainySlots = this.extractTimeSlotsWithRain(forecast.hourlyForecasts)
        .filter(s => s.rainProbability >= 40 && this.isRainyCondition(s.weather));

      if (rainySlots.length > 0) {
        const slotNames = rainySlots.map(s => s.slot).join(', ');
        const maxRainProb = Math.max(...rainySlots.map(s => s.rainProbability));
        highlights.push(`☔ ${slotNames}에 비 예보(${maxRainProb}%), 우산 필수!`);
      }

      const tempDiff = forecast.maxTemp - forecast.minTemp;
      if (tempDiff >= 10) {
        highlights.push(`🌡️ 일교차 ${tempDiff}°C, 겉옷 챙기세요`);
      }

      if (forecast.minTemp <= 0) {
        highlights.push(`❄️ 영하권 추위, 방한용품 필수`);
      } else if (forecast.maxTemp >= 33) {
        highlights.push(`🥵 폭염 주의, 수분 섭취 필수`);
      }
    }

    if (airQuality?.status && ['나쁨', '매우나쁨', 'Bad', 'Very Bad'].some(s =>
      airQuality.status.toLowerCase().includes(s.toLowerCase()))) {
      highlights.push(`😷 미세먼지 ${airQuality.status}, 마스크 착용`);
    }

    return highlights;
  }

  buildAirQualityString(airQuality?: AirQuality): string {
    if (!airQuality) return '정보 없음';
    const pm10 = airQuality.pm10 ? ` (PM10 ${airQuality.pm10}㎍/㎥)` : '';
    return `${airQuality.status || '정보 없음'}${pm10}`;
  }

  buildSubwayInfo(stations?: Array<{ name: string; line: string; arrivals: SubwayArrival[] }>): string {
    if (!stations?.length) return '정보 없음';

    return stations
      .map(s => {
        const arrival = s.arrivals[0];
        const time = arrival ? this.formatArrivalTime(arrival.arrivalTime) : '정보 없음';
        return `• ${s.name}역 (${s.line}) ${time}`;
      })
      .join('\n');
  }

  buildBusInfo(stops?: Array<{ name: string; arrivals: BusArrival[] }>): string {
    if (!stops?.length) return '정보 없음';

    return stops
      .map(s => {
        const arrival = s.arrivals[0];
        if (!arrival) return `• ${s.name} - 정보 없음`;
        const time = this.formatArrivalTime(arrival.arrivalTime);
        return `• ${s.name} - ${arrival.routeName}번 ${time}`;
      })
      .join('\n');
  }

  extractTimeSlotsWithRain(hourlyForecasts: HourlyForecast[]): Array<{
    slot: string;
    weather: string;
    rainProbability: number;
    temperature: number;
  }> {
    const slotMap = new Map<string, {
      weather: string;
      rainProbability: number;
      temperature: number;
      count: number;
    }>();

    for (const forecast of hourlyForecasts) {
      const existing = slotMap.get(forecast.timeSlot);
      if (existing) {
        existing.rainProbability = Math.max(existing.rainProbability, forecast.rainProbability);
        existing.temperature = (existing.temperature * existing.count + forecast.temperature) / (existing.count + 1);
        existing.count++;
        if (this.isRainyCondition(forecast.conditionKr)) {
          existing.weather = forecast.conditionKr;
        }
      } else {
        slotMap.set(forecast.timeSlot, {
          weather: forecast.conditionKr,
          rainProbability: forecast.rainProbability,
          temperature: forecast.temperature,
          count: 1,
        });
      }
    }

    const slotOrder = ['오전', '오후', '저녁'];
    const result = slotOrder
      .filter(slot => slotMap.has(slot))
      .map(slot => {
        const data = slotMap.get(slot)!;
        return {
          slot,
          weather: data.weather,
          rainProbability: data.rainProbability,
          temperature: Math.round(data.temperature),
        };
      });

    for (const slot of slotOrder) {
      if (!result.find(r => r.slot === slot)) {
        result.push({ slot, weather: '정보없음', rainProbability: 0, temperature: 0 });
      }
    }

    return result.slice(0, 3);
  }

  formatArrivalTime(seconds: number): string {
    if (seconds <= 60) return '곧 도착';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}분`;
  }

  generateTip(data: NotificationData): string {
    const weather = data.weather;
    const airQuality = data.airQuality;
    const routeRec = data.routeRecommendation;

    if (weather) {
      const highlights = this.buildWeatherHighlights(weather, airQuality);
      if (highlights.length > 0) {
        return highlights[0].replace(/^[^\w가-힣]+/, '');
      }

      const forecast = weather.forecast;
      if (forecast) {
        const slots = this.extractTimeSlotsWithRain(forecast.hourlyForecasts);
        const morningSlot = slots.find(s => s.slot === '오전');
        const afternoonSlot = slots.find(s => s.slot === '오후');

        if (morningSlot && afternoonSlot && morningSlot.weather !== afternoonSlot.weather) {
          if (this.isRainyCondition(afternoonSlot.weather) && !this.isRainyCondition(morningSlot.weather)) {
            return `오전은 ${morningSlot.weather}이지만 오후에 ${afternoonSlot.weather} 예보`;
          }
        }
      }

      const temp = weather.temperature;
      if (temp <= 5) return '두꺼운 외투 챙기세요';
      if (temp >= 28) return '더위 주의, 수분 섭취하세요';

      const condition = weather.condition.toLowerCase();
      if (condition.includes('rain') || condition.includes('drizzle')) {
        return '비 예보, 우산 챙기세요';
      }
      if (condition.includes('snow')) return '눈 예보, 미끄럼 주의';
    }

    if (airQuality?.status) {
      const status = airQuality.status.toLowerCase();
      if (status.includes('나쁨') || status.includes('bad')) {
        return '미세먼지 나쁨, 마스크 착용 권장';
      }
    }

    if (routeRec && routeRec.totalScore >= 70) {
      const avgMin = routeRec.averageDuration;
      return `추천: "${routeRec.routeName}" (평균 ${avgMin}분)`;
    }

    if (data.linkedRoute) {
      return `${data.linkedRoute.name} 출발 준비하세요`;
    }

    return '좋은 하루 보내세요';
  }

  generateTransitTip(data: NotificationData): string {
    const hasSubway = data.subwayStations?.some(s => s.arrivals.length > 0);
    const hasBus = data.busStops?.some(s => s.arrivals.length > 0);

    if (hasSubway && hasBus) return '지금 출발하면 딱 좋아요!';
    if (hasSubway) return '지하철 도착 정보 확인하세요.';
    if (hasBus) return '버스 도착 정보 확인하세요.';
    return '교통 정보를 확인하세요.';
  }
}
