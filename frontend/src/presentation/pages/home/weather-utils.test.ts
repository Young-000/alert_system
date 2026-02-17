import {
  getWeatherType,
  getWeatherChecklist,
  getAqiStatus,
  getGreeting,
  getWeatherAdvice,
  getTodayKey,
  RAIN_PROBABILITY_THRESHOLD,
  COLD_TEMP_THRESHOLD,
  HOT_TEMP_THRESHOLD,
  TEMP_DIFF_THRESHOLD,
  HIGH_HUMIDITY_THRESHOLD,
} from './weather-utils';
import type { WeatherData } from '@infrastructure/api';

// Helper to build minimal WeatherData
function buildWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    temperature: 20,
    humidity: 50,
    condition: 'clear',
    conditionKr: '맑음',
    windSpeed: 3,
    ...overrides,
  } as WeatherData;
}

const goodAir = { label: '좋음', className: 'aqi-good' };
const badAir = { label: '나쁨', className: 'aqi-bad' };
const veryBadAir = { label: '매우나쁨', className: 'aqi-very-bad' };

// ─── getWeatherType ─────────────────────────────

describe('getWeatherType', () => {
  it('returns sunny for "clear"', () => {
    expect(getWeatherType('clear')).toBe('sunny');
  });

  it('returns sunny for "sunny"', () => {
    expect(getWeatherType('sunny')).toBe('sunny');
  });

  it('returns sunny for Korean "맑음"', () => {
    expect(getWeatherType('맑음')).toBe('sunny');
  });

  it('returns cloudy for "cloudy"', () => {
    expect(getWeatherType('cloudy')).toBe('cloudy');
  });

  it('returns cloudy for Korean "구름많음"', () => {
    expect(getWeatherType('구름많음')).toBe('cloudy');
  });

  it('returns cloudy for "overcast"', () => {
    expect(getWeatherType('overcast')).toBe('cloudy');
  });

  it('returns rainy for "rain"', () => {
    expect(getWeatherType('rain')).toBe('rainy');
  });

  it('returns rainy for Korean "비"', () => {
    expect(getWeatherType('비')).toBe('rainy');
  });

  it('returns rainy for "thunderstorm"', () => {
    expect(getWeatherType('thunderstorm')).toBe('rainy');
  });

  it('returns snowy for "snow"', () => {
    expect(getWeatherType('snow')).toBe('snowy');
  });

  it('returns snowy for Korean "눈"', () => {
    expect(getWeatherType('눈')).toBe('snowy');
  });

  it('returns default for unknown condition', () => {
    expect(getWeatherType('unknown')).toBe('default');
  });

  it('is case-insensitive', () => {
    expect(getWeatherType('CLEAR')).toBe('sunny');
    expect(getWeatherType('Rain')).toBe('rainy');
  });
});

// ─── getWeatherChecklist ────────────────────────

describe('getWeatherChecklist', () => {
  it('returns umbrella for rainy condition', () => {
    const weather = buildWeather({ condition: 'rain' });
    const items = getWeatherChecklist(weather, goodAir);
    expect(items.some(i => i.id === 'umbrella')).toBe(true);
  });

  it('returns umbrella for snowy condition', () => {
    const weather = buildWeather({ condition: 'snow' });
    const items = getWeatherChecklist(weather, goodAir);
    expect(items.some(i => i.id === 'umbrella')).toBe(true);
  });

  it('returns umbrella when rain probability is high', () => {
    const weather = buildWeather({
      condition: 'clear',
      forecast: {
        maxTemp: 25,
        minTemp: 15,
        hourlyForecasts: [
          { timeSlot: '오전', conditionKr: '맑음', rainProbability: RAIN_PROBABILITY_THRESHOLD, temperature: 20 },
        ],
      },
    } as Partial<WeatherData>);
    const items = getWeatherChecklist(weather, goodAir);
    expect(items.some(i => i.id === 'umbrella')).toBe(true);
  });

  it('returns mask for bad air quality', () => {
    const weather = buildWeather();
    const items = getWeatherChecklist(weather, badAir);
    expect(items.some(i => i.id === 'mask')).toBe(true);
  });

  it('returns mask for very bad air quality', () => {
    const weather = buildWeather();
    const items = getWeatherChecklist(weather, veryBadAir);
    expect(items.some(i => i.id === 'mask')).toBe(true);
  });

  it('returns coat for cold temperature', () => {
    const weather = buildWeather({ temperature: COLD_TEMP_THRESHOLD - 1 });
    const items = getWeatherChecklist(weather, goodAir);
    expect(items.some(i => i.id === 'coat')).toBe(true);
  });

  it('returns sunscreen for hot temperature', () => {
    const weather = buildWeather({ temperature: HOT_TEMP_THRESHOLD + 1 });
    const items = getWeatherChecklist(weather, goodAir);
    expect(items.some(i => i.id === 'sun')).toBe(true);
  });

  it('returns scarf for large temperature difference', () => {
    const weather = buildWeather({
      temperature: 20,
      forecast: {
        maxTemp: 25,
        minTemp: 25 - TEMP_DIFF_THRESHOLD,
        hourlyForecasts: [],
      },
    } as Partial<WeatherData>);
    const items = getWeatherChecklist(weather, goodAir);
    expect(items.some(i => i.id === 'scarf')).toBe(true);
  });

  it('returns spare clothes for high humidity', () => {
    const weather = buildWeather({ humidity: HIGH_HUMIDITY_THRESHOLD + 1 });
    const items = getWeatherChecklist(weather, goodAir);
    expect(items.some(i => i.id === 'spare')).toBe(true);
  });

  it('returns empty list for sunny mild day with good air', () => {
    const weather = buildWeather({ temperature: 22, humidity: 50, condition: 'clear' });
    const items = getWeatherChecklist(weather, goodAir);
    expect(items).toHaveLength(0);
  });

  it('returns multiple items for bad combined conditions', () => {
    const weather = buildWeather({
      temperature: 3,
      humidity: HIGH_HUMIDITY_THRESHOLD + 5,
      condition: 'rain',
      forecast: {
        maxTemp: 10,
        minTemp: -2,
        hourlyForecasts: [
          { timeSlot: '오전', conditionKr: '비', rainProbability: 80, temperature: 3 },
        ],
      },
    } as Partial<WeatherData>);
    const items = getWeatherChecklist(weather, badAir);
    const ids = items.map(i => i.id);
    expect(ids).toContain('umbrella');
    expect(ids).toContain('mask');
    expect(ids).toContain('coat');
    expect(ids).toContain('scarf');
    expect(ids).toContain('spare');
  });

  it('does not return scarf when forecast is missing', () => {
    const weather = buildWeather({ forecast: undefined });
    const items = getWeatherChecklist(weather, goodAir);
    expect(items.some(i => i.id === 'scarf')).toBe(false);
  });
});

// ─── getAqiStatus ───────────────────────────────

describe('getAqiStatus', () => {
  it('returns dash for null pm10', () => {
    expect(getAqiStatus(undefined)).toEqual({ label: '-', className: '' });
  });

  it('returns 좋음 for pm10=0', () => {
    expect(getAqiStatus(0)).toEqual({ label: '좋음', className: 'aqi-good' });
  });

  it('returns 좋음 for pm10=30', () => {
    expect(getAqiStatus(30)).toEqual({ label: '좋음', className: 'aqi-good' });
  });

  it('returns 보통 for pm10=31', () => {
    expect(getAqiStatus(31)).toEqual({ label: '보통', className: 'aqi-moderate' });
  });

  it('returns 보통 for pm10=80', () => {
    expect(getAqiStatus(80)).toEqual({ label: '보통', className: 'aqi-moderate' });
  });

  it('returns 나쁨 for pm10=81', () => {
    expect(getAqiStatus(81)).toEqual({ label: '나쁨', className: 'aqi-bad' });
  });

  it('returns 나쁨 for pm10=150', () => {
    expect(getAqiStatus(150)).toEqual({ label: '나쁨', className: 'aqi-bad' });
  });

  it('returns 매우나쁨 for pm10=151', () => {
    expect(getAqiStatus(151)).toEqual({ label: '매우나쁨', className: 'aqi-very-bad' });
  });
});

// ─── getGreeting ────────────────────────────────

describe('getGreeting', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 새벽이에요 for hour 3', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 3, 0));
    expect(getGreeting()).toBe('새벽이에요');
  });

  it('returns 좋은 아침이에요 for hour 7', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 7, 0));
    expect(getGreeting()).toBe('좋은 아침이에요');
  });

  it('returns 좋은 오전이에요 for hour 10', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 10, 0));
    expect(getGreeting()).toBe('좋은 오전이에요');
  });

  it('returns 점심 시간이에요 for hour 13', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 13, 0));
    expect(getGreeting()).toBe('점심 시간이에요');
  });

  it('returns 좋은 오후에요 for hour 15', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 15, 0));
    expect(getGreeting()).toBe('좋은 오후에요');
  });

  it('returns 좋은 저녁이에요 for hour 19', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 19, 0));
    expect(getGreeting()).toBe('좋은 저녁이에요');
  });

  it('returns 좋은 밤이에요 for hour 22', () => {
    jest.setSystemTime(new Date(2026, 1, 17, 22, 0));
    expect(getGreeting()).toBe('좋은 밤이에요');
  });
});

// ─── getWeatherAdvice ───────────────────────────

describe('getWeatherAdvice', () => {
  it('returns umbrella advice for rainy weather', () => {
    const weather = buildWeather({ condition: 'rain' });
    expect(getWeatherAdvice(weather, goodAir)).toBe('우산을 챙기세요');
  });

  it('returns snow warning for snowy weather', () => {
    const weather = buildWeather({ condition: 'snow' });
    expect(getWeatherAdvice(weather, goodAir)).toBe('눈길 조심하세요');
  });

  it('returns mask advice for bad air', () => {
    const weather = buildWeather({ condition: 'clear' });
    expect(getWeatherAdvice(weather, badAir)).toBe('마스크를 챙기세요');
  });

  it('returns cold weather advice for freezing temperature', () => {
    const weather = buildWeather({ temperature: -5, condition: 'clear' });
    expect(getWeatherAdvice(weather, goodAir)).toBe('방한용품을 챙기세요');
  });

  it('returns heat advice for hot temperature', () => {
    const weather = buildWeather({ temperature: 35, condition: 'clear' });
    expect(getWeatherAdvice(weather, goodAir)).toBe('더위에 주의하세요');
  });

  it('returns pleasant advice for sunny mild weather', () => {
    const weather = buildWeather({ temperature: 22, condition: 'sunny' });
    expect(getWeatherAdvice(weather, goodAir)).toBe('쾌적한 날씨에요');
  });

  it('returns default advice for ordinary conditions', () => {
    const weather = buildWeather({ temperature: 22, condition: 'overcast' });
    expect(getWeatherAdvice(weather, goodAir)).toBe('좋은 하루 보내세요');
  });
});

// ─── getTodayKey ────────────────────────────────

describe('getTodayKey', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns YYYY-M-D format', () => {
    jest.setSystemTime(new Date(2026, 1, 17));
    expect(getTodayKey()).toBe('2026-2-17');
  });
});
