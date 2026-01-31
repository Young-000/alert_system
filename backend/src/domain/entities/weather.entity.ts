export interface HourlyForecast {
  time: string; // "09:00", "12:00", etc.
  timeSlot: string; // "오전", "오후", "저녁"
  temperature: number;
  condition: string;
  conditionKr: string;
  icon: string;
  rainProbability: number;
}

export interface DailyForecast {
  maxTemp: number;
  minTemp: number;
  hourlyForecasts: HourlyForecast[];
}

export class Weather {
  constructor(
    public readonly location: string,
    public readonly temperature: number,
    public readonly condition: string,
    public readonly humidity: number,
    public readonly windSpeed: number,
    public readonly feelsLike?: number,
    public readonly forecast?: DailyForecast,
  ) {}

  // 날씨 조건을 한글로 변환
  static conditionToKorean(condition: string): string {
    const conditionMap: Record<string, string> = {
      'Clear': '맑음',
      'Sunny': '맑음',
      'Clouds': '구름많음',
      'Cloudy': '흐림',
      'Overcast': '흐림',
      'Rain': '비',
      'Drizzle': '이슬비',
      'Thunderstorm': '뇌우',
      'Snow': '눈',
      'Mist': '안개',
      'Fog': '안개',
      'Haze': '연무',
      'Dust': '먼지',
      'Sand': '황사',
    };

    for (const [key, value] of Object.entries(conditionMap)) {
      if (condition.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return condition;
  }

  // 날씨 이모지
  static conditionToEmoji(condition: string): string {
    const lower = condition.toLowerCase();
    if (lower.includes('clear') || lower.includes('sunny')) return '☀️';
    if (lower.includes('cloud')) return '☁️';
    if (lower.includes('rain') || lower.includes('drizzle')) return '🌧️';
    if (lower.includes('thunder')) return '⛈️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('mist') || lower.includes('fog')) return '🌫️';
    return '🌤️';
  }

  get conditionKr(): string {
    return Weather.conditionToKorean(this.condition);
  }

  get conditionEmoji(): string {
    return Weather.conditionToEmoji(this.condition);
  }
}
