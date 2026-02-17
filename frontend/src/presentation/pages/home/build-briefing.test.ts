import { describe, it, expect } from 'vitest';
import { getTimeContext, buildBriefing } from './build-briefing';
import type { TimeContext } from './build-briefing';
import type { WeatherData } from '@infrastructure/api';
import type { TransitArrivalInfo } from './route-utils';

// ─── getTimeContext ────────────────────────────────

describe('getTimeContext', () => {
  it.each([
    [6, 'morning'],
    [7, 'morning'],
    [11, 'morning'],
    [12, 'evening'],
    [15, 'evening'],
    [17, 'evening'],
    [18, 'tomorrow'],
    [23, 'tomorrow'],
    [0, 'tomorrow'],
    [5, 'tomorrow'],
  ] as [number, TimeContext][])('hour %d → %s', (hour, expected) => {
    expect(getTimeContext(hour)).toBe(expected);
  });

  it('uses current hour when no argument provided', () => {
    const result = getTimeContext();
    expect(['morning', 'evening', 'tomorrow']).toContain(result);
  });
});

// ─── buildBriefing ─────────────────────────────────

describe('buildBriefing', () => {
  const baseWeather: WeatherData = {
    location: '서울',
    temperature: 3,
    condition: 'Clear',
    humidity: 45,
    windSpeed: 2,
    conditionKr: '맑음',
    conditionEmoji: '☀️',
  };

  const baseAirQuality = { label: '좋음', className: 'aqi-good' };
  const noAirQuality = { label: '-', className: '' };

  const baseStats = {
    userId: 'u1',
    totalSessions: 10,
    recentSessions: 5,
    overallAverageDuration: 45,
    overallAverageWaitTime: 5,
    overallAverageDelay: 2,
    waitTimePercentage: 11,
    routeStats: [],
    dayOfWeekStats: [],
    weatherImpact: [],
    insights: [],
  };

  const subwayTransit: TransitArrivalInfo = {
    type: 'subway',
    name: '강남역',
    arrivals: [{ destination: '신도림행', arrivalTime: 3, stationId: 's1' }],
    isLoading: false,
  };

  const busTransit: TransitArrivalInfo = {
    type: 'bus',
    name: '정류장 1234',
    arrivals: [{ routeName: '340', arrivalTime: 5 }],
    isLoading: false,
  };

  it('returns null when routeName is empty', () => {
    expect(buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: baseStats,
      transitInfos: [],
      routeName: '',
    })).toBeNull();
  });

  it('builds full briefing with all data', () => {
    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: baseStats,
      transitInfos: [subwayTransit],
      routeName: '출근 경로',
    });

    expect(result).not.toBeNull();
    expect(result!.main).toContain('3°');
    expect(result!.main).toContain('좋음');
    expect(result!.main).toContain('약 45분 예상');
    expect(result!.contextLabel).toBe('출근 브리핑');
    expect(result!.sub).toContain('강남역');
    expect(result!.sub).toContain('3분 후 도착');
  });

  it('builds evening briefing label', () => {
    const result = buildBriefing({
      context: 'evening',
      weather: baseWeather,
      airQuality: noAirQuality,
      commuteStats: null,
      transitInfos: [],
      routeName: '퇴근 경로',
    });

    expect(result).not.toBeNull();
    expect(result!.contextLabel).toBe('퇴근 브리핑');
  });

  it('builds tomorrow briefing label', () => {
    const result = buildBriefing({
      context: 'tomorrow',
      weather: baseWeather,
      airQuality: noAirQuality,
      commuteStats: null,
      transitInfos: [],
      routeName: '출근 경로',
    });

    expect(result).not.toBeNull();
    expect(result!.contextLabel).toBe('내일 출근 브리핑');
  });

  it('omits air quality when label is "-"', () => {
    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: noAirQuality,
      commuteStats: null,
      transitInfos: [],
      routeName: '경로',
    });

    expect(result).not.toBeNull();
    expect(result!.main).not.toContain('-');
  });

  it('omits duration when stats are null', () => {
    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: null,
      transitInfos: [],
      routeName: '경로',
    });

    expect(result).not.toBeNull();
    expect(result!.main).not.toContain('분 예상');
  });

  it('omits duration when overallAverageDuration is 0', () => {
    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: { ...baseStats, overallAverageDuration: 0 },
      transitInfos: [],
      routeName: '경로',
    });

    expect(result).not.toBeNull();
    expect(result!.main).not.toContain('분 예상');
  });

  it('falls back to route name when no transit data', () => {
    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: baseStats,
      transitInfos: [],
      routeName: '2호선 출근',
    });

    expect(result!.sub).toBe('2호선 출근');
  });

  it('shows bus transit info in sub line', () => {
    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: baseStats,
      transitInfos: [busTransit],
      routeName: '경로',
    });

    expect(result!.sub).toContain('정류장 1234');
    expect(result!.sub).toContain('5분 후 도착');
  });

  it('shows "곧 도착" when arrivalTime is 0', () => {
    const soonTransit: TransitArrivalInfo = {
      type: 'subway',
      name: '역삼역',
      arrivals: [{ destination: '신도림행', arrivalTime: 0, stationId: 's2' }],
      isLoading: false,
    };

    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: baseStats,
      transitInfos: [soonTransit],
      routeName: '경로',
    });

    expect(result!.sub).toContain('곧 도착');
  });

  it('skips loading transit and uses next one', () => {
    const loadingTransit: TransitArrivalInfo = {
      type: 'subway',
      name: '강남역',
      arrivals: [],
      isLoading: true,
    };

    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: baseStats,
      transitInfos: [loadingTransit, busTransit],
      routeName: '경로',
    });

    expect(result!.sub).toContain('정류장 1234');
  });

  it('skips errored transit and falls back to route name', () => {
    const errorTransit: TransitArrivalInfo = {
      type: 'subway',
      name: '강남역',
      arrivals: [],
      isLoading: false,
      error: '조회 실패',
    };

    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: baseStats,
      transitInfos: [errorTransit],
      routeName: '2호선 출근',
    });

    expect(result!.sub).toBe('2호선 출근');
  });

  it('returns null when weather is null and no other data', () => {
    const result = buildBriefing({
      context: 'morning',
      weather: null,
      airQuality: noAirQuality,
      commuteStats: null,
      transitInfos: [],
      routeName: '경로',
    });

    expect(result).toBeNull();
  });

  it('includes ariaLabel with all context', () => {
    const result = buildBriefing({
      context: 'morning',
      weather: baseWeather,
      airQuality: baseAirQuality,
      commuteStats: baseStats,
      transitInfos: [subwayTransit],
      routeName: '경로',
    });

    expect(result!.ariaLabel).toContain('출근 브리핑');
    expect(result!.ariaLabel).toContain('3°');
    expect(result!.ariaLabel).toContain('강남역');
  });
});
