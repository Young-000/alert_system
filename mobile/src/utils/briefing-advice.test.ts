import { describe, expect, it, vi } from 'vitest';

import { generateAdvices, getBriefingContextLabel } from './briefing-advice';
import { getTimeContext } from './route';

import type { AdviceWeatherInput, BriefingAdvice } from '@/types/briefing';

/**
 * 브리핑 라벨은 `getTimeContext`와 **같은 경계**를 써야 한다.
 *
 * `BriefingCard`는 한 카드 안에서 라벨은 `getBriefingContextLabel`로,
 * 배경색은 `getTimeContext`로 정한다. 두 함수의 경계가 갈리면 라벨이
 * 자기 배경색과 반대되는 시간대를 말한다. 게다가 조언이 하나도 없을 때
 * 그리는 legacy 경로는 `getTimeContext` 라벨을 쓰므로, 같은 시각의 같은
 * 카드가 조언 유무에 따라 다른 라벨을 단다.
 *
 * 웹은 `build-briefing.ts` 하나에서 둘 다 파생시켜 이 문제가 없다.
 */
describe('getBriefingContextLabel', () => {
  const LABEL_BY_CONTEXT = {
    morning: '출근 브리핑',
    evening: '퇴근 브리핑',
    tomorrow: '내일 출근 브리핑',
  } as const;

  it('24시간 전 구간에서 getTimeContext와 어긋나지 않는다', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(getBriefingContextLabel(hour)).toBe(
        LABEL_BY_CONTEXT[getTimeContext(hour)],
      );
    }
  });

  it('18~20시는 내일 출근 브리핑이다 (배경색과 같은 구간)', () => {
    expect(getBriefingContextLabel(18)).toBe('내일 출근 브리핑');
    expect(getBriefingContextLabel(20)).toBe('내일 출근 브리핑');
  });

  it('경계값', () => {
    expect(getBriefingContextLabel(6)).toBe('출근 브리핑');
    expect(getBriefingContextLabel(11)).toBe('출근 브리핑');
    expect(getBriefingContextLabel(12)).toBe('퇴근 브리핑');
    expect(getBriefingContextLabel(17)).toBe('퇴근 브리핑');
    expect(getBriefingContextLabel(5)).toBe('내일 출근 브리핑');
  });
});

/**
 * 강수확률 조언은 **출퇴근 구간의 예보**에서 나와야 한다.
 *
 * `getMaxRainProbability`는 오전(6~14)·오후(12~21) 창을 나눠 그 구간만 보겠다고
 * 적어 두었다. 그런데 백엔드가 내려주는 `time`은 `"09:00"` 꼴이고
 * (`backend/src/domain/entities/weather.entity.ts:2` 주석이 형식을 명시한다),
 * `new Date('09:00')`은 Invalid Date라 `getHours()`가 NaN이 된다. 비교가 전부
 * false가 되어 창이 항상 비고, 매번 폴백(하루 전체 최댓값)으로 떨어진다.
 *
 * 결과: 아침 출근 브리핑이 밤 소나기 확률로 "우산 필수"를 띄운다.
 */
describe('generateAdvices — 강수확률 구간 필터', () => {
  const weatherAt = (
    hourly: { time: string; rainProbability: number }[],
  ): AdviceWeatherInput => ({
    temperature: 18,
    condition: 'Clouds',
    forecast: {
      maxTemp: 20,
      minTemp: 15,
      hourlyForecasts: hourly.map((h) => ({
        time: h.time,
        temperature: 18,
        condition: 'Clouds',
        rainProbability: h.rainProbability,
      })),
    },
  });

  const umbrellaOf = (advices: BriefingAdvice[]) =>
    advices.find((a) => a.category === 'umbrella');

  it('아침에는 밤 예보를 우산 근거로 쓰지 않는다', () => {
    const advices = generateAdvices(
      weatherAt([
        { time: '09:00', rainProbability: 10 },
        { time: '20:00', rainProbability: 80 },
      ]),
      null,
      null,
      8,
    );

    expect(umbrellaOf(advices)).toBeUndefined();
  });

  it('저녁에는 오전 예보를 우산 근거로 쓰지 않는다', () => {
    const advices = generateAdvices(
      weatherAt([
        { time: '08:00', rainProbability: 90 },
        { time: '18:00', rainProbability: 10 },
      ]),
      null,
      null,
      14,
    );

    expect(umbrellaOf(advices)).toBeUndefined();
  });

  it('구간 안의 확률이 60% 이상이면 우산 필수', () => {
    const advices = generateAdvices(
      weatherAt([
        { time: '09:00', rainProbability: 70 },
        { time: '23:00', rainProbability: 0 },
      ]),
      null,
      null,
      8,
    );

    expect(umbrellaOf(advices)?.message).toBe('우산 필수 (강수확률 70%)');
  });

  it('구간 안의 확률이 40~59%면 권유 문구', () => {
    const advices = generateAdvices(
      weatherAt([{ time: '13:00', rainProbability: 45 }]),
      null,
      null,
      8,
    );

    expect(umbrellaOf(advices)?.message).toBe('우산 챙기면 좋겠어요');
  });

  it('구간에 걸리는 예보가 없으면 하루 전체 최댓값으로 폴백한다', () => {
    const advices = generateAdvices(
      weatherAt([{ time: '22:00', rainProbability: 50 }]),
      null,
      null,
      8,
    );

    expect(umbrellaOf(advices)?.message).toBe('우산 챙기면 좋겠어요');
  });

  it('예보가 비어 있으면 우산 조언이 없다', () => {
    const advices = generateAdvices(weatherAt([]), null, null, 8);

    expect(umbrellaOf(advices)).toBeUndefined();
  });

  it('현재 시각을 넘기지 않으면 실제 시각을 쓴다', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 8, 26, 8, 0, 0));

      const advices = generateAdvices(
        weatherAt([
          { time: '09:00', rainProbability: 10 },
          { time: '20:00', rainProbability: 80 },
        ]),
        null,
        null,
      );

      expect(umbrellaOf(advices)).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
