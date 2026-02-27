import { describe, it, expect } from 'vitest';
import { buildAdvicesFromData } from './BriefingSection';
import type { WeatherData } from '@infrastructure/api/weather-api.client';
import type { AirQualityData } from '@infrastructure/api/air-quality-api.client';

// ─── Helpers ──────────────────────────────────

function makeWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    location: 'Seoul',
    temperature: 20,
    condition: 'Clear',
    humidity: 50,
    windSpeed: 3,
    conditionKr: '맑음',
    conditionEmoji: '☀️',
    ...overrides,
  };
}

function makeAirQuality(overrides: Partial<AirQualityData> = {}): AirQualityData {
  return {
    location: 'Seoul',
    pm10: 20,
    pm25: 10,
    aqi: 50,
    status: 'good',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────

describe('buildAdvicesFromData', () => {
  // === Null inputs ===

  it('weather와 airQuality 모두 null이면 빈 배열을 반환한다', () => {
    expect(buildAdvicesFromData(null, null)).toEqual([]);
  });

  it('weather만 null이면 airQuality 조언만 반환한다', () => {
    const result = buildAdvicesFromData(null, makeAirQuality());
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(a => a.text.includes('공기') || a.text.includes('마스크'))).toBe(true);
  });

  it('airQuality만 null이면 weather 조언만 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather(), null);
    expect(result.length).toBeGreaterThan(0);
  });

  // === Temperature ranges (clothing advice) ===

  it('feelsLike가 있으면 체감온도를 기준으로 조언한다', () => {
    const result = buildAdvicesFromData(
      makeWeather({ temperature: 10, feelsLike: -5 }),
      null,
    );
    // feelsLike -5 → ≤0 → '두꺼운 외투 필수'
    expect(result.some(a => a.text.includes('두꺼운 외투'))).toBe(true);
  });

  it('-10도 이하면 패딩 필수 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: -15 }), null);
    expect(result.some(a => a.text.includes('패딩 필수'))).toBe(true);
    expect(result.find(a => a.text.includes('패딩'))?.severity).toBe('danger');
  });

  it('0도 이하면 두꺼운 외투 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: -3 }), null);
    expect(result.some(a => a.text.includes('두꺼운 외투'))).toBe(true);
    expect(result.find(a => a.text.includes('두꺼운'))?.severity).toBe('warning');
  });

  it('5도 이하면 코트/두꺼운 겉옷 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 3 }), null);
    expect(result.some(a => a.text.includes('코트') || a.text.includes('두꺼운 겉옷'))).toBe(true);
  });

  it('10도 이하면 자켓+니트 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 8 }), null);
    expect(result.some(a => a.text.includes('자켓') || a.text.includes('니트'))).toBe(true);
  });

  it('15도 이하면 가벼운 겉옷 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 13 }), null);
    expect(result.some(a => a.text.includes('가벼운 겉옷'))).toBe(true);
  });

  it('20도 이하면 긴팔/얇은 겉옷 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 18 }), null);
    expect(result.some(a => a.text.includes('긴팔') || a.text.includes('얇은 겉옷'))).toBe(true);
  });

  it('25도 이하면 반팔 가능 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 23 }), null);
    expect(result.some(a => a.text.includes('반팔'))).toBe(true);
  });

  it('28도 이하면 수분 섭취 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 27 }), null);
    expect(result.some(a => a.text.includes('수분 섭취'))).toBe(true);
  });

  it('33도 이하면 더위 주의 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 31 }), null);
    expect(result.some(a => a.text.includes('더위 주의'))).toBe(true);
    expect(result.find(a => a.text.includes('더위'))?.severity).toBe('warning');
  });

  it('33도 초과면 폭염 경보 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 36 }), null);
    expect(result.some(a => a.text.includes('폭염'))).toBe(true);
    expect(result.find(a => a.text.includes('폭염'))?.severity).toBe('danger');
  });

  // === Temperature difference ===

  it('일교차 10도 이상이면 겉옷 챙기세요 조언을 반환한다', () => {
    const result = buildAdvicesFromData(
      makeWeather({
        temperature: 15,
        forecast: {
          maxTemp: 25,
          minTemp: 10,
          hourlyForecasts: [],
        },
      }),
      null,
    );
    expect(result.some(a => a.text.includes('일교차') && a.text.includes('겉옷'))).toBe(true);
    expect(result.find(a => a.text.includes('일교차'))?.severity).toBe('warning');
  });

  it('일교차 10도 미만이면 일교차 조언이 없다', () => {
    const result = buildAdvicesFromData(
      makeWeather({
        temperature: 15,
        forecast: {
          maxTemp: 20,
          minTemp: 14,
          hourlyForecasts: [],
        },
      }),
      null,
    );
    expect(result.some(a => a.text.includes('일교차'))).toBe(false);
  });

  // === Rain / weather conditions ===

  it('뇌우 조건이면 외출 주의 danger 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ condition: 'Thunderstorm' }), null);
    expect(result.some(a => a.text.includes('뇌우'))).toBe(true);
    expect(result.find(a => a.text.includes('뇌우'))?.severity).toBe('danger');
  });

  it('눈 조건이면 미끄럼 주의 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ condition: 'Snow' }), null);
    expect(result.some(a => a.text.includes('눈') && a.text.includes('미끄럼'))).toBe(true);
    expect(result.find(a => a.text.includes('눈'))?.severity).toBe('warning');
  });

  it('비 조건이면 우산 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ condition: 'Rain' }), null);
    expect(result.some(a => a.text.includes('우산'))).toBe(true);
  });

  it('이슬비 조건이면 우산 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ condition: 'Drizzle' }), null);
    expect(result.some(a => a.text.includes('우산'))).toBe(true);
  });

  it('안개 조건이면 시야 주의 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ condition: 'Mist' }), null);
    expect(result.some(a => a.text.includes('시야'))).toBe(true);
  });

  it('fog 조건이면 시야 주의 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ condition: 'Fog' }), null);
    expect(result.some(a => a.text.includes('시야'))).toBe(true);
  });

  it('haze 조건이면 시야 주의 조언을 반환한다', () => {
    const result = buildAdvicesFromData(makeWeather({ condition: 'Haze' }), null);
    expect(result.some(a => a.text.includes('시야'))).toBe(true);
  });

  // === Rain probability from hourly forecast ===

  it('강수확률 60% 이상이면 우산 필수 조언을 반환한다', () => {
    const result = buildAdvicesFromData(
      makeWeather({
        condition: 'Clear',
        forecast: {
          maxTemp: 20,
          minTemp: 15,
          hourlyForecasts: [
            { time: '09:00', timeSlot: '오전', temperature: 18, condition: 'Clear', conditionKr: '맑음', icon: '', rainProbability: 70 },
          ],
        },
      }),
      null,
    );
    expect(result.some(a => a.text.includes('우산 필수') && a.text.includes('70%'))).toBe(true);
  });

  it('강수확률 40~59%이면 우산 챙기면 좋겠어요 조언을 반환한다', () => {
    const result = buildAdvicesFromData(
      makeWeather({
        condition: 'Clear',
        forecast: {
          maxTemp: 20,
          minTemp: 15,
          hourlyForecasts: [
            { time: '09:00', timeSlot: '오전', temperature: 18, condition: 'Clear', conditionKr: '맑음', icon: '', rainProbability: 45 },
          ],
        },
      }),
      null,
    );
    expect(result.some(a => a.text.includes('우산 챙기면 좋겠어요'))).toBe(true);
    expect(result.find(a => a.text.includes('우산 챙기면'))?.severity).toBe('info');
  });

  it('강수확률 40% 미만이면 우산 조언이 없다', () => {
    const result = buildAdvicesFromData(
      makeWeather({
        condition: 'Clear',
        forecast: {
          maxTemp: 20,
          minTemp: 15,
          hourlyForecasts: [
            { time: '09:00', timeSlot: '오전', temperature: 18, condition: 'Clear', conditionKr: '맑음', icon: '', rainProbability: 20 },
          ],
        },
      }),
      null,
    );
    expect(result.some(a => a.text.includes('우산'))).toBe(false);
  });

  // === Wind chill ===

  it('체감온도 차이 5도 이상이면 바람 경고 조언을 반환한다', () => {
    const result = buildAdvicesFromData(
      makeWeather({ temperature: 10, feelsLike: 3 }),
      null,
    );
    expect(result.some(a => a.text.includes('바람') && a.text.includes('체감'))).toBe(true);
    expect(result.find(a => a.text.includes('바람'))?.severity).toBe('warning');
  });

  it('체감온도 차이 5도 미만이면 바람 경고가 없다', () => {
    const result = buildAdvicesFromData(
      makeWeather({ temperature: 10, feelsLike: 8 }),
      null,
    );
    expect(result.some(a => a.text.includes('바람이 강해'))).toBe(false);
  });

  // === Air quality ===

  it('공기 좋음(pm10≤30)이면 산책 조언을 반환한다', () => {
    const result = buildAdvicesFromData(null, makeAirQuality({ pm10: 20, pm25: 10 }));
    expect(result.some(a => a.text.includes('공기 좋음') && a.text.includes('산책'))).toBe(true);
    expect(result[0]?.severity).toBe('info');
  });

  it('보통(pm10 31~80)이면 조언을 표시하지 않는다', () => {
    const result = buildAdvicesFromData(null, makeAirQuality({ pm10: 50, pm25: 20 }));
    expect(result.length).toBe(0);
  });

  it('나쁨(pm10>80)이면 마스크 착용 권장 조언을 반환한다', () => {
    const result = buildAdvicesFromData(null, makeAirQuality({ pm10: 100, pm25: 20 }));
    expect(result.some(a => a.text.includes('마스크 착용 권장'))).toBe(true);
    expect(result.find(a => a.text.includes('마스크 착용'))?.severity).toBe('warning');
  });

  it('pm25>35이면 나쁨으로 마스크 조언을 반환한다', () => {
    const result = buildAdvicesFromData(null, makeAirQuality({ pm10: 50, pm25: 40 }));
    expect(result.some(a => a.text.includes('마스크'))).toBe(true);
  });

  it('매우 나쁨(pm10>150)이면 실외활동 자제 danger 조언을 반환한다', () => {
    const result = buildAdvicesFromData(null, makeAirQuality({ pm10: 160, pm25: 50 }));
    expect(result.some(a => a.text.includes('마스크 필수') && a.text.includes('실외활동 자제'))).toBe(true);
    expect(result.find(a => a.text.includes('마스크 필수'))?.severity).toBe('danger');
  });

  it('pm10>80 && pm25>35이면 매우 나쁨으로 판단한다', () => {
    const result = buildAdvicesFromData(null, makeAirQuality({ pm10: 90, pm25: 40 }));
    expect(result.some(a => a.text.includes('마스크 필수'))).toBe(true);
    expect(result.find(a => a.text.includes('마스크 필수'))?.severity).toBe('danger');
  });

  // === Sorting (danger > warning > info) ===

  it('severity 순으로 정렬한다 (danger > warning > info)', () => {
    const result = buildAdvicesFromData(
      makeWeather({
        temperature: -15, // danger: 패딩 필수
        condition: 'Rain', // warning: 우산
        feelsLike: -20,    // wind warning
      }),
      makeAirQuality({ pm10: 20, pm25: 10 }), // info: 공기 좋음
    );

    const severities = result.map(a => a.severity);
    const dangerIdx = severities.indexOf('danger');
    const warningIdx = severities.indexOf('warning');
    const infoIdx = severities.indexOf('info');

    if (dangerIdx >= 0 && warningIdx >= 0) {
      expect(dangerIdx).toBeLessThan(warningIdx);
    }
    if (warningIdx >= 0 && infoIdx >= 0) {
      expect(warningIdx).toBeLessThan(infoIdx);
    }
  });

  // === 4-chip limit ===

  it('최대 4개까지만 조언을 반환한다', () => {
    // Lots of conditions: cold + rain + wind + temp diff + air quality
    const result = buildAdvicesFromData(
      makeWeather({
        temperature: -15,
        feelsLike: -25,
        condition: 'Rain',
        forecast: {
          maxTemp: 5,
          minTemp: -20,
          hourlyForecasts: [],
        },
      }),
      makeAirQuality({ pm10: 160, pm25: 50 }),
    );
    expect(result.length).toBeLessThanOrEqual(4);
  });

  // === Emoji presence ===

  it('각 조언에 emoji가 포함되어 있다', () => {
    const result = buildAdvicesFromData(makeWeather({ temperature: 5 }), makeAirQuality());
    for (const advice of result) {
      expect(advice.emoji.length).toBeGreaterThan(0);
    }
  });
});
