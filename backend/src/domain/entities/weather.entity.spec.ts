import { Weather } from './weather.entity';

/**
 * `condition` 문자열의 어휘는 `weather-api.client.ts`의 `getConditionFromKma`가 정한다.
 * 기상청 PTY/SKY 코드로 만들 수 있는 값은 아래 6개가 전부다.
 *   PTY 1,4,5 -> 'Rain' / PTY 2,6 -> 'Sleet' / PTY 3,7 -> 'Snow'
 *   SKY 1 -> 'Clear' / SKY 3 -> 'Clouds' / SKY 4 -> 'Overcast'
 * 이 맵들은 원래 OpenWeatherMap 어휘로 쓰였기 때문에 'Sleet'·'Overcast'가 빠져 있었다.
 */
const PRODUCED_BY_KMA = ['Clear', 'Clouds', 'Overcast', 'Rain', 'Sleet', 'Snow'];

describe('Weather entity — 기상청이 만드는 condition 어휘 전수', () => {
  describe('conditionToKorean', () => {
    it('기상청이 만드는 6개 값 모두 한글을 돌려준다 (영문이 그대로 새지 않는다)', () => {
      for (const condition of PRODUCED_BY_KMA) {
        const kr = Weather.conditionToKorean(condition);
        expect(kr).not.toBe(condition);
        expect(kr).toMatch(/^[가-힣]+$/);
      }
    });

    it('Sleet은 진눈깨비다', () => {
      expect(Weather.conditionToKorean('Sleet')).toBe('진눈깨비');
    });

    it('기존 매핑을 바꾸지 않는다', () => {
      expect(Weather.conditionToKorean('Clear')).toBe('맑음');
      expect(Weather.conditionToKorean('Clouds')).toBe('구름많음');
      expect(Weather.conditionToKorean('Overcast')).toBe('흐림');
      expect(Weather.conditionToKorean('Rain')).toBe('비');
      expect(Weather.conditionToKorean('Snow')).toBe('눈');
    });

    it('모르는 값은 그대로 돌려준다', () => {
      expect(Weather.conditionToKorean('Tornado')).toBe('Tornado');
    });
  });

  describe('conditionToEmoji', () => {
    it('기상청이 만드는 6개 값 중 어느 것도 기본 이모지로 떨어지지 않는다', () => {
      for (const condition of PRODUCED_BY_KMA) {
        expect(Weather.conditionToEmoji(condition)).not.toBe('🌤️');
      }
    });

    it('흐림은 구름 이모지다 (해 이모지가 아니다)', () => {
      expect(Weather.conditionToEmoji('Overcast')).toBe('☁️');
    });

    it('진눈깨비는 눈비 이모지다', () => {
      expect(Weather.conditionToEmoji('Sleet')).toBe('🌨️');
    });

    it('기존 매핑을 바꾸지 않는다', () => {
      expect(Weather.conditionToEmoji('Clear')).toBe('☀️');
      expect(Weather.conditionToEmoji('Clouds')).toBe('☁️');
      expect(Weather.conditionToEmoji('Rain')).toBe('🌧️');
      expect(Weather.conditionToEmoji('Snow')).toBe('❄️');
    });
  });

  describe('getter', () => {
    it('conditionKr/conditionEmoji는 static과 같은 값을 준다', () => {
      const w = new Weather('서울', 3, 'Sleet', 70, 2);
      expect(w.conditionKr).toBe('진눈깨비');
      expect(w.conditionEmoji).toBe('🌨️');
    });
  });
});
