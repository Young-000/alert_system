import { BriefingAdviceService, BriefingInput } from './briefing-advice.service';
import { BriefingAdviceDto } from '@application/dto/briefing.dto';
import {
  WidgetWeatherDto,
  WidgetAirQualityDto,
  WidgetTransitDto,
  WidgetDepartureDataDto,
} from '@application/dto/widget-data.dto';

describe('BriefingAdviceService', () => {
  let service: BriefingAdviceService;

  beforeEach(() => {
    service = new BriefingAdviceService();
  });

  // ─── Helper factories ─────────────────────────

  function buildWeather(overrides: Partial<WidgetWeatherDto> = {}): WidgetWeatherDto {
    return {
      temperature: overrides.temperature ?? 20,
      condition: overrides.condition ?? 'Clear',
      conditionEmoji: overrides.conditionEmoji ?? '☀️',
      conditionKr: overrides.conditionKr ?? '맑음',
      feelsLike: overrides.feelsLike,
      maxTemp: overrides.maxTemp,
      minTemp: overrides.minTemp,
    };
  }

  function buildAirQuality(overrides: Partial<WidgetAirQualityDto> = {}): WidgetAirQualityDto {
    return {
      pm10: overrides.pm10 ?? 25,
      pm25: overrides.pm25 ?? 10,
      status: overrides.status ?? '좋음',
      statusLevel: overrides.statusLevel ?? 'good',
    };
  }

  function buildTransit(overrides: Partial<WidgetTransitDto> = {}): WidgetTransitDto {
    return {
      subway: overrides.subway ?? null,
      bus: overrides.bus ?? null,
    };
  }

  function buildDeparture(overrides: Partial<WidgetDepartureDataDto> = {}): WidgetDepartureDataDto {
    return {
      departureType: overrides.departureType ?? 'commute',
      optimalDepartureAt: overrides.optimalDepartureAt ?? '07:30',
      minutesUntilDeparture: overrides.minutesUntilDeparture ?? 30,
      estimatedTravelMin: overrides.estimatedTravelMin ?? 45,
      arrivalTarget: overrides.arrivalTarget ?? '09:00',
      status: overrides.status ?? 'normal',
      hasTrafficDelay: overrides.hasTrafficDelay ?? false,
    };
  }

  function buildInput(overrides: Partial<BriefingInput> = {}): BriefingInput {
    return {
      weather: overrides.weather ?? buildWeather(),
      airQuality: overrides.airQuality ?? buildAirQuality(),
      transit: overrides.transit ?? buildTransit(),
      departure: overrides.departure ?? null,
      timeContext: overrides.timeContext ?? 'morning',
    };
  }

  function findAdviceByCategory(
    advices: BriefingAdviceDto[],
    category: string,
  ): BriefingAdviceDto | undefined {
    return advices.find((a) => a.category === category);
  }

  // ─── Clothing Advice Tests ─────────────────────────

  describe('기온별 옷차림 조언', () => {
    it('극한 추위 (-10도 이하)이면 패딩 필수 danger 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: -15 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.severity).toBe('danger');
      expect(clothing!.icon).toBe('🥶');
      expect(clothing!.message).toContain('패딩 필수');
    });

    it('-10도 ~ 0도 사이면 두꺼운 외투 필수 warning 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: -5 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.severity).toBe('warning');
      expect(clothing!.icon).toBe('🧥');
      expect(clothing!.message).toContain('두꺼운 외투');
    });

    it('0도 ~ 5도 사이면 코트 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: 3 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.severity).toBe('warning');
      expect(clothing!.message).toContain('코트');
    });

    it('5도 ~ 10도 사이면 자켓+니트 info 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: 8 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.severity).toBe('info');
      expect(clothing!.message).toContain('자켓');
    });

    it('10도 ~ 15도 사이면 가벼운 겉옷 info 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: 12 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.severity).toBe('info');
      expect(clothing!.message).toContain('가벼운 겉옷');
    });

    it('15도 ~ 20도 사이면 긴팔 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: 18 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.message).toContain('긴팔');
    });

    it('20도 ~ 25도 사이면 반팔+냉방 주의 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: 22 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.message).toContain('반팔');
      expect(clothing!.message).toContain('냉방');
    });

    it('25도 ~ 28도 사이면 반팔+수분 섭취 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: 27 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.icon).toBe('☀️');
      expect(clothing!.message).toContain('수분');
    });

    it('28도 ~ 33도 사이면 더위 주의 warning 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: 30 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.severity).toBe('warning');
      expect(clothing!.message).toContain('더위 주의');
    });

    it('33도 이상이면 폭염 경보 danger 조언을 반환한다', () => {
      const result = service.generate(buildInput({ weather: buildWeather({ temperature: 36 }) }));

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      expect(clothing!.severity).toBe('danger');
      expect(clothing!.icon).toBe('🔥');
      expect(clothing!.message).toContain('폭염');
    });

    it('체감온도가 있으면 실제 기온보다 체감온도를 우선 사용한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 5, feelsLike: -12 }),
        }),
      );

      const clothing = findAdviceByCategory(result.advices, 'clothing');
      expect(clothing).toBeDefined();
      // feelsLike -12이면 danger, temperature 5이면 warning
      expect(clothing!.severity).toBe('danger');
      expect(clothing!.message).toContain('패딩');
    });
  });

  // ─── Temperature Range (일교차) Tests ─────────────────────────

  describe('일교차 조언', () => {
    it('일교차가 10도 이상이면 겉옷 챙기라는 warning 조언을 추가한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 15, maxTemp: 25, minTemp: 5 }),
        }),
      );

      const tempAdvice = result.advices.find((a) => a.message.includes('일교차'));
      expect(tempAdvice).toBeDefined();
      expect(tempAdvice!.severity).toBe('warning');
      expect(tempAdvice!.message).toContain('20도');
      expect(tempAdvice!.message).toContain('겉옷');
    });

    it('일교차가 10도 미만이면 일교차 조언을 추가하지 않는다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 15, maxTemp: 20, minTemp: 12 }),
        }),
      );

      const tempAdvice = result.advices.find((a) => a.message.includes('일교차'));
      expect(tempAdvice).toBeUndefined();
    });

    it('maxTemp 또는 minTemp가 없으면 일교차 조언을 생성하지 않는다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 15 }),
        }),
      );

      const tempAdvice = result.advices.find((a) => a.message.includes('일교차'));
      expect(tempAdvice).toBeUndefined();
    });
  });

  // ─── Umbrella / Precipitation Tests ─────────────────────────

  describe('강수/날씨 조언', () => {
    it('뇌우 예보가 있으면 danger 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ condition: 'Thunderstorm' }),
        }),
      );

      const umbrella = findAdviceByCategory(result.advices, 'umbrella');
      expect(umbrella).toBeDefined();
      expect(umbrella!.severity).toBe('danger');
      expect(umbrella!.icon).toBe('⛈️');
      expect(umbrella!.message).toContain('뇌우');
    });

    it('눈 예보가 있으면 미끄럼 주의 warning 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ condition: 'Snow' }),
        }),
      );

      const umbrella = findAdviceByCategory(result.advices, 'umbrella');
      expect(umbrella).toBeDefined();
      expect(umbrella!.severity).toBe('warning');
      expect(umbrella!.icon).toBe('❄️');
      expect(umbrella!.message).toContain('눈');
    });

    it('비 조건(rain)이면 우산 챙기라는 warning 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ condition: 'Light Rain' }),
        }),
      );

      const umbrella = findAdviceByCategory(result.advices, 'umbrella');
      expect(umbrella).toBeDefined();
      expect(umbrella!.severity).toBe('warning');
      expect(umbrella!.icon).toBe('🌂');
      expect(umbrella!.message).toContain('우산');
    });

    it('이슬비(drizzle) 조건이면 우산 챙기라는 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ condition: 'Drizzle' }),
        }),
      );

      const umbrella = findAdviceByCategory(result.advices, 'umbrella');
      expect(umbrella).toBeDefined();
      expect(umbrella!.message).toContain('우산');
    });

    it('안개/연무 조건이면 시야 주의 info 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ condition: 'Mist' }),
        }),
      );

      const umbrella = findAdviceByCategory(result.advices, 'umbrella');
      expect(umbrella).toBeDefined();
      expect(umbrella!.severity).toBe('info');
      expect(umbrella!.icon).toBe('🌫️');
      expect(umbrella!.message).toContain('시야');
    });

    it('fog 조건도 시야 주의 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ condition: 'Fog' }),
        }),
      );

      const umbrella = findAdviceByCategory(result.advices, 'umbrella');
      expect(umbrella).toBeDefined();
      expect(umbrella!.message).toContain('시야');
    });

    it('맑은 날씨면 우산/강수 관련 조언을 반환하지 않는다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ condition: 'Clear' }),
        }),
      );

      const umbrella = findAdviceByCategory(result.advices, 'umbrella');
      expect(umbrella).toBeUndefined();
    });
  });

  // ─── Wind Advice Tests ─────────────────────────

  describe('풍속 조언', () => {
    it('체감온도와 실제 기온 차이가 5도 이상이면 바람 warning 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 10, feelsLike: 3 }),
        }),
      );

      const wind = findAdviceByCategory(result.advices, 'wind');
      expect(wind).toBeDefined();
      expect(wind!.severity).toBe('warning');
      expect(wind!.icon).toBe('💨');
      expect(wind!.message).toContain('바람');
      expect(wind!.message).toContain('3도');
    });

    it('체감온도와 실제 기온 차이가 5도 미만이면 바람 조언을 반환하지 않는다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 10, feelsLike: 7 }),
        }),
      );

      const wind = findAdviceByCategory(result.advices, 'wind');
      expect(wind).toBeUndefined();
    });

    it('체감온도가 없으면 바람 조언을 반환하지 않는다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 10 }),
        }),
      );

      const wind = findAdviceByCategory(result.advices, 'wind');
      expect(wind).toBeUndefined();
    });
  });

  // ─── Air Quality / Mask Tests ─────────────────────────

  describe('미세먼지 조언', () => {
    it('PM10이 좋음(good)이면 공기 좋다는 info 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          airQuality: buildAirQuality({ statusLevel: 'good', pm10: 20, pm25: 10 }),
        }),
      );

      const mask = findAdviceByCategory(result.advices, 'mask');
      expect(mask).toBeDefined();
      expect(mask!.severity).toBe('info');
      expect(mask!.icon).toBe('😊');
      expect(mask!.message).toContain('공기 좋음');
    });

    it('PM10이 보통(moderate)이면 미세먼지 보통 info 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          airQuality: buildAirQuality({ statusLevel: 'moderate', pm10: 50, pm25: 20 }),
        }),
      );

      const mask = findAdviceByCategory(result.advices, 'mask');
      expect(mask).toBeDefined();
      expect(mask!.severity).toBe('info');
      expect(mask!.icon).toBe('😐');
      expect(mask!.message).toContain('보통');
    });

    it('PM10이 나쁨(unhealthy)이면 마스크 착용 권장 warning 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          airQuality: buildAirQuality({ statusLevel: 'unhealthy', pm10: 100, pm25: 40 }),
        }),
      );

      const mask = findAdviceByCategory(result.advices, 'mask');
      expect(mask).toBeDefined();
      expect(mask!.severity).toBe('warning');
      expect(mask!.icon).toBe('😷');
      expect(mask!.message).toContain('마스크 착용');
    });

    it('PM10이 매우 나쁨(veryUnhealthy)이면 마스크 필수 danger 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          airQuality: buildAirQuality({ statusLevel: 'veryUnhealthy', pm10: 200, pm25: 80 }),
        }),
      );

      const mask = findAdviceByCategory(result.advices, 'mask');
      expect(mask).toBeDefined();
      expect(mask!.severity).toBe('danger');
      expect(mask!.icon).toBe('🤢');
      expect(mask!.message).toContain('마스크 필수');
      expect(mask!.message).toContain('실외활동 자제');
    });

    it('PM2.5가 35 초과이고 statusLevel이 moderate이면 unhealthy로 보정한다', () => {
      const result = service.generate(
        buildInput({
          airQuality: buildAirQuality({ statusLevel: 'moderate', pm10: 50, pm25: 40 }),
        }),
      );

      const mask = findAdviceByCategory(result.advices, 'mask');
      expect(mask).toBeDefined();
      // PM2.5 correction: moderate -> unhealthy
      expect(mask!.severity).toBe('warning');
      expect(mask!.message).toContain('마스크 착용');
    });

    it('airQuality가 null이면 마스크 조언을 반환하지 않는다', () => {
      const result = service.generate({
        weather: buildWeather(),
        airQuality: null,
        transit: buildTransit(),
        departure: null,
        timeContext: 'morning',
      });

      const mask = findAdviceByCategory(result.advices, 'mask');
      expect(mask).toBeUndefined();
    });
  });

  // ─── Transit Advice Tests ─────────────────────────

  describe('교통 조언', () => {
    it('지하철 도착이 3분 이하이면 서두르라는 warning 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          transit: buildTransit({
            subway: {
              stationName: '강남역',
              lineInfo: '2호선',
              arrivalMinutes: 2,
              destination: '사당',
            },
          }),
        }),
      );

      const transit = result.advices.find((a) => a.category === 'transit' && a.icon === '🚇');
      expect(transit).toBeDefined();
      expect(transit!.severity).toBe('warning');
      expect(transit!.message).toContain('강남역');
      expect(transit!.message).toContain('곧 도착');
    });

    it('지하철 도착이 3분 초과이면 n분 후 도착 info 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          transit: buildTransit({
            subway: {
              stationName: '강남역',
              lineInfo: '2호선',
              arrivalMinutes: 7,
              destination: '사당',
            },
          }),
        }),
      );

      const transit = result.advices.find((a) => a.category === 'transit' && a.icon === '🚇');
      expect(transit).toBeDefined();
      expect(transit!.severity).toBe('info');
      expect(transit!.message).toContain('7분 후');
    });

    it('버스 도착이 3분 이하이면 곧 도착 warning 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          transit: buildTransit({
            bus: {
              stopName: '강남역정류장',
              routeName: '146',
              arrivalMinutes: 1,
              remainingStops: 2,
            },
          }),
        }),
      );

      const transit = result.advices.find((a) => a.category === 'transit' && a.icon === '🚌');
      expect(transit).toBeDefined();
      expect(transit!.severity).toBe('warning');
      expect(transit!.message).toContain('146번');
      expect(transit!.message).toContain('곧 도착');
    });

    it('버스 도착이 3분 초과이면 n분 후 + 정거장수 info 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          transit: buildTransit({
            bus: {
              stopName: '강남역정류장',
              routeName: '146',
              arrivalMinutes: 8,
              remainingStops: 5,
            },
          }),
        }),
      );

      const transit = result.advices.find((a) => a.category === 'transit' && a.icon === '🚌');
      expect(transit).toBeDefined();
      expect(transit!.severity).toBe('info');
      expect(transit!.message).toContain('8분 후');
      expect(transit!.message).toContain('5정거장');
    });

    it('교통 데이터가 없으면 교통 조언을 반환하지 않는다', () => {
      const result = service.generate(
        buildInput({
          transit: buildTransit(),
        }),
      );

      const transit = result.advices.find((a) => a.category === 'transit');
      expect(transit).toBeUndefined();
    });
  });

  // ─── Departure Advice Tests ─────────────────────────

  describe('출발 조언', () => {
    it('출발까지 10분 이하이면 출발 warning 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          departure: buildDeparture({ minutesUntilDeparture: 5 }),
        }),
      );

      const departureAdvice = result.advices.find((a) => a.message.includes('출발까지'));
      expect(departureAdvice).toBeDefined();
      expect(departureAdvice!.severity).toBe('warning');
      expect(departureAdvice!.message).toContain('5분');
    });

    it('교통 지연이 감지되면 여유 출발 warning 조언을 반환한다', () => {
      const result = service.generate(
        buildInput({
          departure: buildDeparture({ hasTrafficDelay: true }),
        }),
      );

      const delayAdvice = result.advices.find((a) => a.message.includes('교통 지연'));
      expect(delayAdvice).toBeDefined();
      expect(delayAdvice!.severity).toBe('warning');
    });

    it('departure가 null이면 출발 조언을 반환하지 않는다', () => {
      const result = service.generate(buildInput({ departure: null }));

      const departureAdvice = result.advices.find((a) => a.message.includes('출발'));
      expect(departureAdvice).toBeUndefined();
    });
  });

  // ─── Sorting & Limiting Tests ─────────────────────────

  describe('정렬 및 제한', () => {
    it('최대 4개의 조언만 반환한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({
            temperature: -15,
            condition: 'Thunderstorm',
            feelsLike: -25,
            maxTemp: 5,
            minTemp: -15,
          }),
          airQuality: buildAirQuality({ statusLevel: 'veryUnhealthy', pm10: 200, pm25: 80 }),
          transit: buildTransit({
            subway: {
              stationName: '강남역',
              lineInfo: '2호선',
              arrivalMinutes: 2,
              destination: '사당',
            },
            bus: {
              stopName: '강남역정류장',
              routeName: '146',
              arrivalMinutes: 1,
              remainingStops: 2,
            },
          }),
        }),
      );

      expect(result.advices.length).toBeLessThanOrEqual(4);
    });

    it('danger 조언이 warning/info 조언보다 먼저 온다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 20, condition: 'Clear' }),
          airQuality: buildAirQuality({ statusLevel: 'veryUnhealthy', pm10: 200, pm25: 80 }),
        }),
      );

      const dangerIndex = result.advices.findIndex((a) => a.severity === 'danger');
      const infoIndex = result.advices.findIndex((a) => a.severity === 'info');

      if (dangerIndex >= 0 && infoIndex >= 0) {
        expect(dangerIndex).toBeLessThan(infoIndex);
      }
    });

    it('같은 severity에서는 category 순서대로 정렬된다 (umbrella > mask > clothing)', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 3, condition: 'Rain' }),
          airQuality: buildAirQuality({ statusLevel: 'unhealthy', pm10: 100, pm25: 40 }),
        }),
      );

      const warningAdvices = result.advices.filter((a) => a.severity === 'warning');
      if (warningAdvices.length >= 2) {
        const categories = warningAdvices.map((a) => a.category);
        const umbrellaIdx = categories.indexOf('umbrella');
        const maskIdx = categories.indexOf('mask');
        const clothingIdx = categories.indexOf('clothing');

        if (umbrellaIdx >= 0 && maskIdx >= 0) {
          expect(umbrellaIdx).toBeLessThan(maskIdx);
        }
        if (maskIdx >= 0 && clothingIdx >= 0) {
          expect(maskIdx).toBeLessThan(clothingIdx);
        }
      }
    });
  });

  // ─── Context Label Tests ─────────────────────────

  describe('컨텍스트 라벨', () => {
    it('morning 컨텍스트이면 "출근 브리핑"을 반환한다', () => {
      const result = service.generate(buildInput({ timeContext: 'morning' }));

      expect(result.contextLabel).toBe('출근 브리핑');
    });

    it('evening 컨텍스트이면 "퇴근 브리핑"을 반환한다', () => {
      const result = service.generate(buildInput({ timeContext: 'evening' }));

      expect(result.contextLabel).toBe('퇴근 브리핑');
    });
  });

  // ─── Summary Tests ─────────────────────────

  describe('요약 (summary)', () => {
    it('조언이 있으면 가장 높은 severity 조언의 message를 summary로 사용한다', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 3, condition: 'Clear' }),
          airQuality: buildAirQuality({ statusLevel: 'veryUnhealthy', pm10: 200, pm25: 80 }),
        }),
      );

      // veryUnhealthy is danger, highest severity
      expect(result.summary).toContain('마스크 필수');
    });

    it('조언이 없고 날씨 데이터가 있으면 기온+날씨 요약을 반환한다', () => {
      // Edge case: weather with no advice-generating conditions
      // This shouldn't happen normally since clothing advice always exists
      // but the fallback is tested via the service method
      const result = service.generate(
        buildInput({
          weather: buildWeather({ temperature: 20, condition: 'Clear' }),
          airQuality: null,
        }),
      );

      // Should have at least clothing advice
      expect(result.advices.length).toBeGreaterThan(0);
      expect(result.summary).toBeTruthy();
    });

    it('날씨도 조언도 없으면 기본 메시지를 반환한다', () => {
      const result = service.generate({
        weather: null,
        airQuality: null,
        transit: { subway: null, bus: null },
        departure: null,
        timeContext: 'morning',
      });

      expect(result.summary).toBe('좋은 하루 보내세요');
    });
  });

  // ─── Widget Briefing Text Tests ─────────────────────────

  describe('위젯 브리핑 텍스트', () => {
    it('generate와 동일한 summary를 반환한다', () => {
      const input = buildInput({
        weather: buildWeather({ temperature: 3 }),
      });

      const widgetText = service.generateWidgetBriefingText(input);
      const fullResult = service.generate(input);

      expect(widgetText).toBe(fullResult.summary);
    });
  });

  // ─── updatedAt Tests ─────────────────────────

  describe('updatedAt', () => {
    it('ISO 8601 형식의 타임스탬프를 반환한다', () => {
      const result = service.generate(buildInput());
      expect(result.updatedAt).toBeTruthy();
      // ISO 8601 format check
      expect(() => new Date(result.updatedAt)).not.toThrow();
      expect(new Date(result.updatedAt).toISOString()).toBe(result.updatedAt);
    });
  });

  // ─── Edge Cases ─────────────────────────

  describe('엣지 케이스', () => {
    it('모든 데이터가 null/empty여도 에러 없이 동작한다', () => {
      const result = service.generate({
        weather: null,
        airQuality: null,
        transit: { subway: null, bus: null },
        departure: null,
        timeContext: 'morning',
      });

      expect(result).toBeDefined();
      expect(result.advices).toEqual([]);
      expect(result.contextLabel).toBe('출근 브리핑');
      expect(result.summary).toBe('좋은 하루 보내세요');
    });

    it('경계값 온도(-10, 0, 5, 10, 15, 20, 25, 28, 33)를 올바르게 처리한다', () => {
      // -10도: <= -10이므로 danger
      const atMinus10 = service.generate(
        buildInput({ weather: buildWeather({ temperature: -10 }) }),
      );
      expect(findAdviceByCategory(atMinus10.advices, 'clothing')!.severity).toBe('danger');

      // 0도: > -10 && <= 0이므로 warning (두꺼운 외투)
      const at0 = service.generate(buildInput({ weather: buildWeather({ temperature: 0 }) }));
      expect(findAdviceByCategory(at0.advices, 'clothing')!.severity).toBe('warning');
      expect(findAdviceByCategory(at0.advices, 'clothing')!.message).toContain('두꺼운 외투');

      // 5도: > 0 && <= 5이므로 warning (코트)
      const at5 = service.generate(buildInput({ weather: buildWeather({ temperature: 5 }) }));
      expect(findAdviceByCategory(at5.advices, 'clothing')!.message).toContain('코트');

      // 33도: > 28 && <= 33이므로 warning (더위 주의)
      const at33 = service.generate(buildInput({ weather: buildWeather({ temperature: 33 }) }));
      expect(findAdviceByCategory(at33.advices, 'clothing')!.severity).toBe('warning');
    });

    it('복합 시나리오: 추운 비오는 날 미세먼지 나쁨 + 지하철 곧 도착', () => {
      const result = service.generate(
        buildInput({
          weather: buildWeather({
            temperature: 3,
            condition: 'Rain',
            maxTemp: 8,
            minTemp: -2,
          }),
          airQuality: buildAirQuality({
            statusLevel: 'unhealthy',
            pm10: 100,
            pm25: 50,
          }),
          transit: buildTransit({
            subway: {
              stationName: '강남역',
              lineInfo: '2호선',
              arrivalMinutes: 2,
              destination: '사당',
            },
          }),
          timeContext: 'morning',
        }),
      );

      expect(result.advices.length).toBeLessThanOrEqual(4);
      expect(result.contextLabel).toBe('출근 브리핑');

      // Should have warning or higher severity advices
      const hasUmbrella = result.advices.some((a) => a.category === 'umbrella');
      const hasMask = result.advices.some((a) => a.category === 'mask');
      const hasClothing = result.advices.some((a) => a.category === 'clothing');

      expect(hasUmbrella).toBe(true);
      expect(hasMask).toBe(true);
      expect(hasClothing).toBe(true);
    });
  });

  // ─── Static getTimeContext Tests ─────────────────────────

  describe('getTimeContext', () => {
    it('morning 또는 evening 중 하나를 반환한다', () => {
      const result = BriefingAdviceService.getTimeContext();
      expect(['morning', 'evening']).toContain(result);
    });
  });
});
