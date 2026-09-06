import { describe, expect, it } from 'vitest';

import { getBriefingContextLabel } from './briefing-advice';
import { getTimeContext } from './route';

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
