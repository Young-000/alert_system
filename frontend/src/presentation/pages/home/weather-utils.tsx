import type { WeatherData } from '@infrastructure/api';

// ─── Constants ─────────────────────────────────────
export const RAIN_PROBABILITY_THRESHOLD = 40;
export const COLD_TEMP_THRESHOLD = 5;
export const HOT_TEMP_THRESHOLD = 28;
export const TEMP_DIFF_THRESHOLD = 10;
export const HIGH_HUMIDITY_THRESHOLD = 80;
export const CHECKLIST_STORAGE_KEY = 'weather_checklist';
export const ROUTE_RECOMMENDATION_CONFIDENCE_THRESHOLD = 0.5;
export const DEPARTURE_PREDICTION_CONFIDENCE_THRESHOLD = 0.3;

// ─── Types ─────────────────────────────────────────
export interface ChecklistItem {
  id: string;
  emoji: string;
  label: string;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'default';

// English → Korean weather condition map (OpenWeatherMap API responses)
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

/** Translates English weather condition to Korean. */
export function translateCondition(condition: string): string {
  const key = condition.toLowerCase().trim();
  return CONDITION_KR_MAP[key] ?? condition;
}

// ─── Pure Functions ────────────────────────────────

export function getWeatherType(condition: string): WeatherType {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny') || c === '맑음') return 'sunny';
  if (c.includes('cloud') || c === '구름많음' || c.includes('overcast') || c === '흐림') return 'cloudy';
  if (c.includes('rain') || c === '비' || c.includes('thunder') || c === '뇌우') return 'rainy';
  if (c.includes('snow') || c === '눈') return 'snowy';
  return 'default';
}

export function getWeatherChecklist(
  weather: WeatherData,
  airQuality: { label: string; className: string },
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const type = getWeatherType(weather.condition);

  const maxRainProb = weather.forecast?.hourlyForecasts
    ? Math.max(...weather.forecast.hourlyForecasts.map(h => h.rainProbability))
    : 0;
  if (type === 'rainy' || type === 'snowy' || maxRainProb >= RAIN_PROBABILITY_THRESHOLD) {
    items.push({ id: 'umbrella', emoji: '\u2614', label: '\uc6b0\uc0b0' });
  }
  const isBadAir = airQuality.className === 'aqi-bad' || airQuality.className === 'aqi-very-bad';
  if (isBadAir) {
    items.push({ id: 'mask', emoji: '\uD83D\uDE37', label: '\ub9c8\uc2a4\ud06c' });
  }
  if (weather.temperature < COLD_TEMP_THRESHOLD) {
    items.push({ id: 'coat', emoji: '\uD83E\uDDE5', label: '\ub530\ub73b\ud55c \uc678\ud22c' });
  }
  if (weather.temperature > HOT_TEMP_THRESHOLD) {
    items.push({ id: 'sun', emoji: '\u2600\uFE0F', label: '\uc120\ud06c\ub9bc/\uc591\uc0b0' });
  }
  const tempMax = weather.forecast?.maxTemp;
  const tempMin = weather.forecast?.minTemp;
  if (tempMax != null && tempMin != null && (tempMax - tempMin) >= TEMP_DIFF_THRESHOLD) {
    items.push({ id: 'scarf', emoji: '\uD83E\uDDE3', label: '\uac89\uc637 (\uc77c\uad50\ucc28)' });
  }
  if (weather.humidity > HIGH_HUMIDITY_THRESHOLD) {
    items.push({ id: 'spare', emoji: '\uD83D\uDC55', label: '\uc5ec\ubd84\uc758 \uc637' });
  }

  return items;
}

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function getCheckedItems(): Set<string> {
  try {
    const stored = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    if (parsed.date !== getTodayKey()) return new Set();
    return new Set(parsed.checked || []);
  } catch {
    return new Set();
  }
}

export function saveCheckedItems(checked: Set<string>): void {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({
    date: getTodayKey(),
    checked: Array.from(checked),
  }));
}

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

export function WeatherIcon({ condition, size = 48 }: { condition: string; size?: number }): JSX.Element {
  const type = getWeatherType(condition);
  switch (type) {
    case 'sunny':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="10" fill="#FBBF24" />
          <g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round">
            <line x1="24" y1="2" x2="24" y2="8" />
            <line x1="24" y1="40" x2="24" y2="46" />
            <line x1="2" y1="24" x2="8" y2="24" />
            <line x1="40" y1="24" x2="46" y2="24" />
            <line x1="8.3" y1="8.3" x2="12.5" y2="12.5" />
            <line x1="35.5" y1="35.5" x2="39.7" y2="39.7" />
            <line x1="8.3" y1="39.7" x2="12.5" y2="35.5" />
            <line x1="35.5" y1="12.5" x2="39.7" y2="8.3" />
          </g>
        </svg>
      );
    case 'cloudy':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M14 34a8 8 0 0 1-.5-16A10 10 0 0 1 33 20h1a6 6 0 0 1 0 12H14z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        </svg>
      );
    case 'rainy':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M14 28a8 8 0 0 1-.5-16A10 10 0 0 1 33 14h1a6 6 0 0 1 0 12H14z" fill="#94A3B8" stroke="#64748B" strokeWidth="2" />
          <g stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round">
            <line x1="16" y1="34" x2="14" y2="40" />
            <line x1="24" y1="34" x2="22" y2="40" />
            <line x1="32" y1="34" x2="30" y2="40" />
          </g>
        </svg>
      );
    case 'snowy':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M14 28a8 8 0 0 1-.5-16A10 10 0 0 1 33 14h1a6 6 0 0 1 0 12H14z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
          <g fill="#93C5FD">
            <circle cx="16" cy="37" r="2.5" />
            <circle cx="24" cy="37" r="2.5" />
            <circle cx="32" cy="37" r="2.5" />
          </g>
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="18" r="8" fill="#FBBF24" opacity="0.7" />
          <path d="M18 34a6 6 0 0 1-.4-12A8 8 0 0 1 32 24h.5a5 5 0 0 1 0 10H18z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="2" />
        </svg>
      );
  }
}

export function getWeatherAdvice(weather: WeatherData, airQuality: { label: string; className: string }): string {
  const type = getWeatherType(weather.condition);
  if (type === 'rainy') return '우산을 챙기세요';
  if (type === 'snowy') return '눈길 조심하세요';
  if (airQuality.className === 'aqi-bad' || airQuality.className === 'aqi-very-bad') return '마스크를 챙기세요';
  if (weather.temperature < 0) return '방한용품을 챙기세요';
  if (weather.temperature > 33) return '더위에 주의하세요';
  if (type === 'sunny') return '쾌적한 날씨에요';
  return '좋은 하루 보내세요';
}

export function getAqiStatus(pm10: number | undefined): { label: string; className: string } {
  if (pm10 == null) return { label: '-', className: '' };
  if (pm10 <= 30) return { label: '좋음', className: 'aqi-good' };
  if (pm10 <= 80) return { label: '보통', className: 'aqi-moderate' };
  if (pm10 <= 150) return { label: '나쁨', className: 'aqi-bad' };
  return { label: '매우나쁨', className: 'aqi-very-bad' };
}
