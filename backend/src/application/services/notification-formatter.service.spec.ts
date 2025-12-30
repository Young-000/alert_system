import { NotificationFormatterService } from './notification-formatter.service';
import { Weather } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { AlertType } from '@domain/entities/alert.entity';

describe('NotificationFormatterService', () => {
  let service: NotificationFormatterService;

  beforeEach(() => {
    service = new NotificationFormatterService();
  });

  it('should format weather notification', () => {
    const weather: Weather = {
      location: '서울시 강남구',
      temperature: 15,
      condition: '맑음',
      humidity: 60,
      windSpeed: 10,
    };

    const result = service.formatBody({ weather }, [AlertType.WEATHER]);
    expect(result).toContain('날씨');
    expect(result).toContain('15°C');
    expect(result).toContain('맑음');
  });

  it('should format air quality notification', () => {
    const airQuality: AirQuality = {
      location: '서울시 강남구',
      pm10: 50,
      pm25: 25,
      aqi: 50,
      status: '좋음',
    };

    const result = service.formatBody({ airQuality }, [AlertType.AIR_QUALITY]);
    expect(result).toContain('미세먼지');
    expect(result).toContain('좋음');
    expect(result).toContain('PM10: 50');
  });

  it('should format bus notification', () => {
    const bus: BusArrival[] = [
      new BusArrival('stop123', 'route146', '146', 5, 3),
      new BusArrival('stop123', 'route146', '146', 10, 5),
    ];

    const result = service.formatBody({ bus }, [AlertType.BUS]);
    expect(result).toContain('버스 도착 정보');
    expect(result).toContain('146번');
    expect(result).toContain('5분 후');
  });

  it('should format subway notification', () => {
    const subway: SubwayArrival[] = [
      new SubwayArrival('station123', 'line2', '상행', 3, '성수역'),
      new SubwayArrival('station123', 'line2', '하행', 6, '강남역'),
    ];

    const result = service.formatBody({ subway }, [AlertType.SUBWAY]);
    expect(result).toContain('지하철 도착 정보');
    expect(result).toContain('line2호선');
    expect(result).toContain('3분 후');
  });

  it('should format multiple alert types', () => {
    const weather: Weather = {
      location: '서울시 강남구',
      temperature: 15,
      condition: '맑음',
      humidity: 60,
      windSpeed: 10,
    };

    const airQuality: AirQuality = {
      location: '서울시 강남구',
      pm10: 50,
      pm25: 25,
      aqi: 50,
      status: '좋음',
    };

    const result = service.formatBody(
      { weather, airQuality },
      [AlertType.WEATHER, AlertType.AIR_QUALITY]
    );

    expect(result).toContain('날씨');
    expect(result).toContain('미세먼지');
  });
});
