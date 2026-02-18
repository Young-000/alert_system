import type { AqiStatus, WeatherData } from '@/types/home';

// ─── Constants ─────────────────────────────────────

const CONDITION_KR_MAP: Record<string, string> = {
  clear: '맑음',
  'clear sky': '맑음',
  sunny: '맑음',
  clouds: '구름많음',
  'few clouds': '구름조금',
  'scattered clouds': '구름조금',
  'broken clouds': '구름많음',
  'overcast clouds': '흐림',
  overcast: '흐림',
  rain: '비',
  'light rain': '가벼운 비',
  'moderate rain': '비',
  'heavy rain': '폭우',
  'light intensity drizzle': '이슬비',
  drizzle: '이슬비',
  thunderstorm: '뇌우',
  snow: '눈',
  'light snow': '가벼운 눈',
  'heavy snow': '폭설',
  mist: '안개',
  fog: '안개',
  haze: '연무',
  dust: '먼지',
  smoke: '연기',
};

// ─── Pure Functions ────────────────────────────────

/** Returns time-based greeting message. */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '새벽이에요';
  if (hour < 9) return '좋은 아침이에요';
  if (hour < 12) return '좋은 오전이에요';
  if (hour < 14) return '점심 시간이에요';
  if (hour < 18) return '좋은 오후에요';
  if (hour < 21) return '좋은 저녁이에요';
  return '좋은 밤이에요';
}

/** Translates English weather condition to Korean. */
export function translateCondition(condition: string): string {
  const key = condition.toLowerCase().trim();
  return CONDITION_KR_MAP[key] ?? condition;
}

/** Returns AQI status with label and colors based on PM10 value. */
export function getAqiStatus(pm10: number | undefined): AqiStatus {
  if (pm10 == null) return { label: '-', color: '#6B7280', backgroundColor: '#F3F4F6' };
  if (pm10 <= 30) return { label: '좋음', color: '#059669', backgroundColor: '#D1FAE5' };
  if (pm10 <= 80) return { label: '보통', color: '#D97706', backgroundColor: '#FEF3C7' };
  if (pm10 <= 150) return { label: '나쁨', color: '#EA580C', backgroundColor: '#FED7AA' };
  return { label: '매우나쁨', color: '#DC2626', backgroundColor: '#FEE2E2' };
}

type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'default';

function getWeatherType(condition: string): WeatherType {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny') || c === '맑음') return 'sunny';
  if (c.includes('cloud') || c === '구름많음' || c.includes('overcast') || c === '흐림') return 'cloudy';
  if (c.includes('rain') || c === '비' || c.includes('thunder') || c === '뇌우') return 'rainy';
  if (c.includes('snow') || c === '눈') return 'snowy';
  return 'default';
}

/** Returns weather advice text. */
export function getWeatherAdvice(
  weather: WeatherData,
  aqiStatus: AqiStatus,
): string {
  const type = getWeatherType(weather.condition);
  if (type === 'rainy') return '우산을 챙기세요';
  if (type === 'snowy') return '눈길 조심하세요';
  if (aqiStatus.label === '나쁨' || aqiStatus.label === '매우나쁨') return '마스크를 챙기세요';
  if (weather.temperature < 0) return '방한용품을 챙기세요';
  if (weather.temperature > 33) return '더위에 주의하세요';
  if (type === 'sunny') return '쾌적한 날씨에요';
  return '좋은 하루 보내세요';
}
