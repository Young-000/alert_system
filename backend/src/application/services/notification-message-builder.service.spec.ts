import { NotificationMessageBuilderService, NotificationData } from './notification-message-builder.service';
import { Weather, HourlyForecast, DailyForecast } from '@domain/entities/weather.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';
import { BusArrival } from '@domain/entities/bus-arrival.entity';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { CommuteRoute, RouteType } from '@domain/entities/commute-route.entity';
import { RouteScoreDto } from '@application/dto/route-recommendation.dto';

describe('NotificationMessageBuilderService', () => {
  let service: NotificationMessageBuilderService;

  beforeEach(() => {
    service = new NotificationMessageBuilderService();
  });

  // ─── Helper factories ─────────────────────────

  function buildWeather(overrides: Partial<{
    location: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
    forecast: DailyForecast;
  }> = {}): Weather {
    return new Weather(
      overrides.location ?? 'Seoul',
      overrides.temperature ?? 20,
      overrides.condition ?? 'Clear',
      overrides.humidity ?? 50,
      overrides.windSpeed ?? 3,
      overrides.feelsLike,
      overrides.forecast,
    );
  }

  function buildForecast(overrides: Partial<DailyForecast> = {}): DailyForecast {
    return {
      maxTemp: overrides.maxTemp ?? 25,
      minTemp: overrides.minTemp ?? 10,
      hourlyForecasts: overrides.hourlyForecasts ?? [],
    };
  }

  function buildHourly(slot: string, conditionKr: string, rainProbability: number, temperature = 20): HourlyForecast {
    return {
      time: '12:00',
      timeSlot: slot,
      temperature,
      condition: conditionKr,
      conditionKr,
      icon: 'icon',
      rainProbability,
    };
  }

  function buildAirQuality(status = '보통', pm10 = 45): AirQuality {
    return new AirQuality('Seoul', pm10, 20, 50, status);
  }

  // ─── isRainyCondition ─────────────────────────

  describe('isRainyCondition', () => {
    it.each([
      ['비', true],
      ['눈', true],
      ['소나기', true],
      ['뇌우', true],
      ['이슬비', true],
      ['rain', true],
      ['snow', true],
      ['drizzle', true],
      ['맑음', false],
      ['흐림', false],
      ['구름많음', false],
    ])('"%s" → %s', (condition, expected) => {
      expect(service.isRainyCondition(condition)).toBe(expected);
    });

    it('is case-insensitive', () => {
      expect(service.isRainyCondition('RAIN')).toBe(true);
      expect(service.isRainyCondition('Snow')).toBe(true);
    });
  });

  // ─── formatArrivalTime ────────────────────────

  describe('formatArrivalTime', () => {
    it('returns "곧 도착" for 60 seconds or less', () => {
      expect(service.formatArrivalTime(60)).toBe('곧 도착');
      expect(service.formatArrivalTime(30)).toBe('곧 도착');
      expect(service.formatArrivalTime(0)).toBe('곧 도착');
    });

    it('returns minutes for values over 60 seconds', () => {
      expect(service.formatArrivalTime(120)).toBe('2분');
      expect(service.formatArrivalTime(300)).toBe('5분');
    });

    it('floors partial minutes', () => {
      expect(service.formatArrivalTime(90)).toBe('1분');
      expect(service.formatArrivalTime(179)).toBe('2분');
    });
  });

  // ─── buildWeatherString ───────────────────────

  describe('buildWeatherString', () => {
    it('returns conditionKr when no forecast', () => {
      const weather = buildWeather({ condition: 'Rain' });
      expect(service.buildWeatherString(weather)).toBe('비');
    });

    it('returns conditionKr when hourlyForecasts is empty', () => {
      const weather = buildWeather({
        condition: 'Clear',
        forecast: buildForecast({ hourlyForecasts: [] }),
      });
      expect(service.buildWeatherString(weather)).toBe('맑음');
    });

    it('formats slots with arrow separator', () => {
      const weather = buildWeather({
        forecast: buildForecast({
          hourlyForecasts: [
            buildHourly('오전', '맑음', 0),
            buildHourly('오후', '흐림', 10),
            buildHourly('저녁', '맑음', 0),
          ],
        }),
      });
      const result = service.buildWeatherString(weather);
      expect(result).toContain('오전 맑음');
      expect(result).toContain('→');
      expect(result).toContain('저녁 맑음');
    });

    it('includes rain probability for rainy slots', () => {
      const weather = buildWeather({
        forecast: buildForecast({
          hourlyForecasts: [
            buildHourly('오전', '맑음', 0),
            buildHourly('오후', '비', 60),
          ],
        }),
      });
      const result = service.buildWeatherString(weather);
      expect(result).toContain('오후 비(60%)');
    });

    it('does not include rain probability for non-rainy slots even with >0 probability', () => {
      const weather = buildWeather({
        forecast: buildForecast({
          hourlyForecasts: [
            buildHourly('오전', '흐림', 30),
          ],
        }),
      });
      const result = service.buildWeatherString(weather);
      expect(result).not.toContain('(30%)');
    });
  });

  // ─── buildAirQualityString ────────────────────

  describe('buildAirQualityString', () => {
    it('returns "정보 없음" when airQuality is undefined', () => {
      expect(service.buildAirQualityString(undefined)).toBe('정보 없음');
    });

    it('returns status with PM10 value', () => {
      const aq = buildAirQuality('보통', 45);
      expect(service.buildAirQualityString(aq)).toBe('보통 (PM10 45㎍/㎥)');
    });

    it('returns status without PM10 when pm10 is 0 (falsy)', () => {
      const aq = new AirQuality('Seoul', 0, 10, 30, '좋음');
      expect(service.buildAirQualityString(aq)).toBe('좋음');
    });

    it('returns "정보 없음" when status is empty', () => {
      const aq = new AirQuality('Seoul', 50, 20, 50, '');
      expect(service.buildAirQualityString(aq)).toBe('정보 없음 (PM10 50㎍/㎥)');
    });
  });

  // ─── extractTimeSlotsWithRain ─────────────────

  describe('extractTimeSlotsWithRain', () => {
    it('returns 3 slots even with partial data', () => {
      const forecasts = [buildHourly('오전', '맑음', 0)];
      const result = service.extractTimeSlotsWithRain(forecasts);
      expect(result).toHaveLength(3);
      expect(result.map(r => r.slot)).toEqual(['오전', '오후', '저녁']);
    });

    it('fills missing slots with defaults', () => {
      const forecasts = [buildHourly('오후', '비', 70)];
      const result = service.extractTimeSlotsWithRain(forecasts);
      const morning = result.find(r => r.slot === '오전')!;
      expect(morning.weather).toBe('정보없음');
      expect(morning.rainProbability).toBe(0);
    });

    it('takes max rain probability for duplicated slots', () => {
      const forecasts = [
        buildHourly('오전', '맑음', 20, 15),
        buildHourly('오전', '비', 80, 18),
      ];
      const result = service.extractTimeSlotsWithRain(forecasts);
      const morning = result.find(r => r.slot === '오전')!;
      expect(morning.rainProbability).toBe(80);
    });

    it('prefers rainy condition when merging duplicated slots', () => {
      const forecasts = [
        buildHourly('오전', '맑음', 10, 15),
        buildHourly('오전', '비', 70, 18),
      ];
      const result = service.extractTimeSlotsWithRain(forecasts);
      const morning = result.find(r => r.slot === '오전')!;
      expect(morning.weather).toBe('비');
    });

    it('averages temperatures for duplicated slots', () => {
      const forecasts = [
        buildHourly('오전', '맑음', 0, 10),
        buildHourly('오전', '맑음', 0, 20),
      ];
      const result = service.extractTimeSlotsWithRain(forecasts);
      const morning = result.find(r => r.slot === '오전')!;
      expect(morning.temperature).toBe(15);
    });

    it('follows 오전 → 오후 → 저녁 order', () => {
      const forecasts = [
        buildHourly('저녁', '맑음', 0),
        buildHourly('오전', '맑음', 0),
        buildHourly('오후', '맑음', 0),
      ];
      const result = service.extractTimeSlotsWithRain(forecasts);
      expect(result[0].slot).toBe('오전');
      expect(result[1].slot).toBe('오후');
      expect(result[2].slot).toBe('저녁');
    });
  });

  // ─── buildSubwayInfo ──────────────────────────

  describe('buildSubwayInfo', () => {
    it('returns "정보 없음" when no stations', () => {
      expect(service.buildSubwayInfo(undefined)).toBe('정보 없음');
      expect(service.buildSubwayInfo([])).toBe('정보 없음');
    });

    it('formats station name, line, and arrival time', () => {
      const stations = [{
        name: '강남',
        line: '2호선',
        arrivals: [new SubwayArrival('st-1', 'line-2', '상행', 180, '삼성')],
      }];
      expect(service.buildSubwayInfo(stations)).toBe('• 강남역 (2호선) 3분');
    });

    it('shows "곧 도착" for immediate arrivals', () => {
      const stations = [{
        name: '역삼',
        line: '2호선',
        arrivals: [new SubwayArrival('st-2', 'line-2', '하행', 30, '강남')],
      }];
      expect(service.buildSubwayInfo(stations)).toBe('• 역삼역 (2호선) 곧 도착');
    });

    it('shows "정보 없음" when station has no arrivals', () => {
      const stations = [{
        name: '삼성',
        line: '2호선',
        arrivals: [],
      }];
      expect(service.buildSubwayInfo(stations)).toBe('• 삼성역 (2호선) 정보 없음');
    });

    it('joins multiple stations with newline', () => {
      const stations = [
        { name: '강남', line: '2호선', arrivals: [new SubwayArrival('st-1', 'l-2', '상행', 120, '삼성')] },
        { name: '교대', line: '3호선', arrivals: [new SubwayArrival('st-2', 'l-3', '하행', 300, '남부터미널')] },
      ];
      const result = service.buildSubwayInfo(stations);
      expect(result).toContain('• 강남역 (2호선) 2분');
      expect(result).toContain('\n');
      expect(result).toContain('• 교대역 (3호선) 5분');
    });
  });

  // ─── buildBusInfo ─────────────────────────────

  describe('buildBusInfo', () => {
    it('returns "정보 없음" when no stops', () => {
      expect(service.buildBusInfo(undefined)).toBe('정보 없음');
      expect(service.buildBusInfo([])).toBe('정보 없음');
    });

    it('formats stop name, route name, and arrival time', () => {
      const stops = [{
        name: '강남역정류장',
        arrivals: [new BusArrival('stop-1', 'route-1', '146', 240, 3)],
      }];
      expect(service.buildBusInfo(stops)).toBe('• 강남역정류장 - 146번 4분');
    });

    it('shows "정보 없음" when stop has no arrivals', () => {
      const stops = [{
        name: '역삼역정류장',
        arrivals: [],
      }];
      expect(service.buildBusInfo(stops)).toBe('• 역삼역정류장 - 정보 없음');
    });

    it('joins multiple stops with newline', () => {
      const stops = [
        { name: '정류장A', arrivals: [new BusArrival('s1', 'r1', '100', 120, 2)] },
        { name: '정류장B', arrivals: [new BusArrival('s2', 'r2', '200', 300, 5)] },
      ];
      const result = service.buildBusInfo(stops);
      expect(result).toContain('• 정류장A - 100번 2분');
      expect(result).toContain('\n');
      expect(result).toContain('• 정류장B - 200번 5분');
    });
  });

  // ─── buildSummary ─────────────────────────────

  describe('buildSummary', () => {
    it('returns "알림 발송" for empty data', () => {
      expect(service.buildSummary({})).toBe('알림 발송');
    });

    it('includes weather info', () => {
      const data: NotificationData = { weather: buildWeather({ temperature: 15, condition: 'Clear' }) };
      const result = service.buildSummary(data);
      expect(result).toContain('15°');
      expect(result).toContain('맑음');
    });

    it('includes air quality info', () => {
      const data: NotificationData = { airQuality: buildAirQuality('나쁨') };
      expect(service.buildSummary(data)).toContain('미세먼지 나쁨');
    });

    it('includes subway station names', () => {
      const data: NotificationData = {
        subwayStations: [{ name: '강남', line: '2호선', arrivals: [] }],
      };
      expect(service.buildSummary(data)).toContain('지하철 강남');
    });

    it('includes bus stop count', () => {
      const data: NotificationData = {
        busStops: [
          { name: '정류장A', arrivals: [] },
          { name: '정류장B', arrivals: [] },
        ],
      };
      expect(service.buildSummary(data)).toContain('버스 2개 정류장');
    });

    it('joins all parts with pipe separator', () => {
      const data: NotificationData = {
        weather: buildWeather(),
        airQuality: buildAirQuality(),
      };
      expect(service.buildSummary(data)).toContain(' | ');
    });
  });

  // ─── generateTip ──────────────────────────────

  describe('generateTip', () => {
    it('returns weather highlight first when available', () => {
      const data: NotificationData = {
        weather: buildWeather({
          temperature: -2,
          condition: 'Clear',
          forecast: buildForecast({
            minTemp: -5,
            maxTemp: 5,
            hourlyForecasts: [
              buildHourly('오전', '비', 80, -2),
              buildHourly('오후', '비', 90, 0),
            ],
          }),
        }),
        airQuality: buildAirQuality(),
      };
      const tip = service.generateTip(data);
      // Should pick from buildWeatherHighlights
      expect(tip.length).toBeGreaterThan(0);
    });

    it('returns cold weather tip when temp <= 5', () => {
      const data: NotificationData = {
        weather: buildWeather({ temperature: 3, condition: 'Clear' }),
      };
      expect(service.generateTip(data)).toBe('두꺼운 외투 챙기세요');
    });

    it('returns hot weather tip when temp >= 28', () => {
      const data: NotificationData = {
        weather: buildWeather({ temperature: 30, condition: 'Clear' }),
      };
      expect(service.generateTip(data)).toBe('더위 주의, 수분 섭취하세요');
    });

    it('returns rain tip for rainy condition', () => {
      const data: NotificationData = {
        weather: buildWeather({ temperature: 20, condition: 'Rain' }),
      };
      expect(service.generateTip(data)).toBe('비 예보, 우산 챙기세요');
    });

    it('returns snow tip for snowy condition', () => {
      const data: NotificationData = {
        weather: buildWeather({ temperature: 20, condition: 'Snow' }),
      };
      expect(service.generateTip(data)).toBe('눈 예보, 미끄럼 주의');
    });

    it('returns air quality tip when status is bad', () => {
      const data: NotificationData = {
        airQuality: buildAirQuality('나쁨'),
      };
      expect(service.generateTip(data)).toBe('미세먼지 나쁨, 마스크 착용 권장');
    });

    it('returns route recommendation tip when score >= 70', () => {
      const routeRec: RouteScoreDto = {
        routeId: 'r1',
        routeName: '출근길A',
        totalScore: 80,
        scores: { speed: 80, reliability: 80, weatherResilience: 80 },
        averageDuration: 35,
        variability: 5,
        sampleCount: 10,
        reasons: [],
      };
      const data: NotificationData = { routeRecommendation: routeRec };
      expect(service.generateTip(data)).toBe('추천: "출근길A" (평균 35분)');
    });

    it('returns linked route tip when linkedRoute is provided', () => {
      const route = new CommuteRoute('user-1', '아침 출근길', RouteType.MORNING);
      const data: NotificationData = { linkedRoute: route };
      expect(service.generateTip(data)).toBe('아침 출근길 출발 준비하세요');
    });

    it('returns default tip when no special conditions', () => {
      const data: NotificationData = {};
      expect(service.generateTip(data)).toBe('좋은 하루 보내세요');
    });
  });

  // ─── generateTransitTip ───────────────────────

  describe('generateTransitTip', () => {
    it('returns subway+bus tip when both have arrivals', () => {
      const data: NotificationData = {
        subwayStations: [{ name: '강남', line: '2호선', arrivals: [new SubwayArrival('s1', 'l2', '상행', 120, '삼성')] }],
        busStops: [{ name: '정류장A', arrivals: [new BusArrival('b1', 'r1', '146', 180, 3)] }],
      };
      expect(service.generateTransitTip(data)).toBe('지금 출발하면 딱 좋아요!');
    });

    it('returns subway-only tip when only subway has arrivals', () => {
      const data: NotificationData = {
        subwayStations: [{ name: '강남', line: '2호선', arrivals: [new SubwayArrival('s1', 'l2', '상행', 120, '삼성')] }],
        busStops: [{ name: '정류장A', arrivals: [] }],
      };
      expect(service.generateTransitTip(data)).toBe('지하철 도착 정보 확인하세요.');
    });

    it('returns bus-only tip when only bus has arrivals', () => {
      const data: NotificationData = {
        subwayStations: [{ name: '강남', line: '2호선', arrivals: [] }],
        busStops: [{ name: '정류장A', arrivals: [new BusArrival('b1', 'r1', '146', 180, 3)] }],
      };
      expect(service.generateTransitTip(data)).toBe('버스 도착 정보 확인하세요.');
    });

    it('returns default tip when no arrivals', () => {
      const data: NotificationData = {
        subwayStations: [{ name: '강남', line: '2호선', arrivals: [] }],
        busStops: [],
      };
      expect(service.generateTransitTip(data)).toBe('교통 정보를 확인하세요.');
    });

    it('returns default tip when no transit data at all', () => {
      expect(service.generateTransitTip({})).toBe('교통 정보를 확인하세요.');
    });
  });

  // ─── buildWeatherHighlights ───────────────────

  describe('buildWeatherHighlights', () => {
    it('returns empty for mild sunny weather', () => {
      const weather = buildWeather({
        temperature: 22,
        condition: 'Clear',
        forecast: buildForecast({
          maxTemp: 25,
          minTemp: 18,
          hourlyForecasts: [
            buildHourly('오전', '맑음', 0),
            buildHourly('오후', '맑음', 0),
          ],
        }),
      });
      expect(service.buildWeatherHighlights(weather)).toHaveLength(0);
    });

    it('includes rain warning when probability >= 40%', () => {
      const weather = buildWeather({
        forecast: buildForecast({
          hourlyForecasts: [
            buildHourly('오전', '맑음', 10),
            buildHourly('오후', '비', 60),
          ],
        }),
      });
      const highlights = service.buildWeatherHighlights(weather);
      expect(highlights.some(h => h.includes('비 예보'))).toBe(true);
      expect(highlights.some(h => h.includes('우산'))).toBe(true);
    });

    it('includes temperature difference warning when >= 10', () => {
      const weather = buildWeather({
        forecast: buildForecast({
          maxTemp: 25,
          minTemp: 12,
          hourlyForecasts: [buildHourly('오전', '맑음', 0)],
        }),
      });
      const highlights = service.buildWeatherHighlights(weather);
      expect(highlights.some(h => h.includes('일교차'))).toBe(true);
    });

    it('includes freezing warning when minTemp <= 0', () => {
      const weather = buildWeather({
        forecast: buildForecast({
          maxTemp: 5,
          minTemp: -3,
          hourlyForecasts: [buildHourly('오전', '맑음', 0)],
        }),
      });
      const highlights = service.buildWeatherHighlights(weather);
      expect(highlights.some(h => h.includes('영하'))).toBe(true);
    });

    it('includes heat warning when maxTemp >= 33', () => {
      const weather = buildWeather({
        forecast: buildForecast({
          maxTemp: 35,
          minTemp: 25,
          hourlyForecasts: [buildHourly('오전', '맑음', 0)],
        }),
      });
      const highlights = service.buildWeatherHighlights(weather);
      expect(highlights.some(h => h.includes('폭염'))).toBe(true);
    });

    it('includes mask warning for bad air quality', () => {
      const weather = buildWeather({
        forecast: buildForecast({ hourlyForecasts: [buildHourly('오전', '맑음', 0)] }),
      });
      const aq = buildAirQuality('나쁨');
      const highlights = service.buildWeatherHighlights(weather, aq);
      expect(highlights.some(h => h.includes('마스크'))).toBe(true);
    });

    it('includes mask warning for "매우나쁨" air quality', () => {
      const weather = buildWeather({
        forecast: buildForecast({ hourlyForecasts: [buildHourly('오전', '맑음', 0)] }),
      });
      const aq = buildAirQuality('매우나쁨');
      const highlights = service.buildWeatherHighlights(weather, aq);
      expect(highlights.some(h => h.includes('미세먼지'))).toBe(true);
    });
  });
});
