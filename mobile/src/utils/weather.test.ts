import { describe, expect, it } from 'vitest';

import {
  getAqiStatus,
  getWeatherAdvice,
  getWeatherType,
  resolveAqiDisplay,
  translateCondition,
} from './weather';

import type { WeatherData } from '@/types/home';

describe('resolveAqiDisplay', () => {
  it('미세먼지 값이 있으면 배지로 보여준다', () => {
    expect(resolveAqiDisplay(getAqiStatus(20), null)).toEqual({
      kind: 'value',
      label: '좋음',
    });
  });

  it('조회에 실패하면 실패 사유를 보여준다', () => {
    // pm10이 없으면 getAqiStatus는 '-'를 준다. 그 '-'를 그대로 배지에 찍으면
    // 사용자는 실패했다는 사실도, 다시 볼 방법도 알 수 없다 (웹은 사유를 띄운다).
    expect(resolveAqiDisplay(getAqiStatus(undefined), '미세먼지 정보 없음')).toEqual({
      kind: 'error',
      message: '미세먼지 정보 없음',
    });
  });

  it('값도 실패도 없으면 아무것도 보여주지 않는다', () => {
    expect(resolveAqiDisplay(getAqiStatus(undefined), null)).toEqual({
      kind: 'hidden',
    });
  });

  it('값이 있으면 과거 실패 사유보다 값을 우선한다', () => {
    expect(resolveAqiDisplay(getAqiStatus(200), '미세먼지 정보 없음')).toEqual({
      kind: 'value',
      label: '매우나쁨',
    });
  });
});

describe('진눈깨비(기상청 PTY 2·6) — 백엔드가 만드는 condition 어휘', () => {
  it('한글로 옮긴다 (영문 Sleet 가 화면에 새지 않는다)', () => {
    expect(translateCondition('Sleet')).toBe('진눈깨비');
  });

  it('비로 분류한다 — 기본값으로 떨어지지 않는다', () => {
    expect(getWeatherType('Sleet')).toBe('rainy');
    expect(getWeatherType('진눈깨비')).toBe('rainy');
  });

  it('우산 조언을 준다', () => {
    const weather: WeatherData = {
      location: '서울',
      temperature: 3,
      condition: 'Sleet',
      humidity: 70,
      windSpeed: 2,
      conditionKr: '진눈깨비',
      conditionEmoji: '🌨️',
    };
    expect(getWeatherAdvice(weather, getAqiStatus(20))).toBe('우산을 챙기세요');
  });

  it('기존 분류를 바꾸지 않는다', () => {
    expect(getWeatherType('Rain')).toBe('rainy');
    expect(getWeatherType('Snow')).toBe('snowy');
    expect(getWeatherType('Clear')).toBe('sunny');
    expect(getWeatherType('Overcast')).toBe('cloudy');
  });
});
