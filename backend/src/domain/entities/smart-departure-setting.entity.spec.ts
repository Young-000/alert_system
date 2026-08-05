import { SmartDepartureSetting } from './smart-departure-setting.entity';

const USER_ID = 'user-1';
const ROUTE_ID = 'route-1';

function validSetting(): SmartDepartureSetting {
  return SmartDepartureSetting.create(USER_ID, ROUTE_ID, 'commute', '09:00');
}

describe('SmartDepartureSetting', () => {
  describe('create', () => {
    it('기본값을 채운다', () => {
      const setting = validSetting();

      expect(setting.prepTimeMinutes).toBe(30);
      expect(setting.activeDays).toEqual([1, 2, 3, 4, 5]);
      expect(setting.preAlerts).toEqual([30, 10, 0]);
      expect(setting.isEnabled).toBe(true);
    });

    it.each(['24:00', '99:99', '08:60'])('범위를 벗어난 %s를 거부한다', (arrivalTarget) => {
      expect(() =>
        SmartDepartureSetting.create(USER_ID, ROUTE_ID, 'commute', arrivalTarget),
      ).toThrow(/arrivalTarget/);
    });
  });

  describe('withUpdatedFields', () => {
    it('변경한 필드만 바꾸고 나머지는 보존한다', () => {
      const updated = validSetting().withUpdatedFields({ arrivalTarget: '10:15' });

      expect(updated.arrivalTarget).toBe('10:15');
      expect(updated.departureType).toBe('commute');
      expect(updated.prepTimeMinutes).toBe(30);
      expect(updated.activeDays).toEqual([1, 2, 3, 4, 5]);
    });

    // create가 막는 값을 update가 통과시키면, 저장된 설정이 조용히 무효 상태가 된다.
    it.each(['24:00', '99:99', '08:60'])('범위를 벗어난 %s를 거부한다', (arrivalTarget) => {
      expect(() => validSetting().withUpdatedFields({ arrivalTarget })).toThrow(
        /arrivalTarget/,
      );
    });

    it('범위를 벗어난 prepTimeMinutes를 거부한다', () => {
      expect(() => validSetting().withUpdatedFields({ prepTimeMinutes: 5 })).toThrow(
        /prepTimeMinutes/,
      );
    });

    it('빈 activeDays를 거부한다', () => {
      expect(() => validSetting().withUpdatedFields({ activeDays: [] })).toThrow(
        /activeDays/,
      );
    });
  });

  describe('toggleEnabled', () => {
    it('isEnabled만 뒤집고 나머지를 보존한다', () => {
      const toggled = validSetting().toggleEnabled();

      expect(toggled.isEnabled).toBe(false);
      expect(toggled.arrivalTarget).toBe('09:00');
      expect(toggled.toggleEnabled().isEnabled).toBe(true);
    });
  });
});
