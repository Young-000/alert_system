import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateSmartDepartureSettingDto,
  UpdateSmartDepartureSettingDto,
} from './smart-departure.dto';

const ROUTE_ID = '11111111-1111-4111-8111-111111111111';

async function errorsFor<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(cls, payload);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('smart-departure DTO validation', () => {
  describe('arrivalTarget', () => {
    // arrivalTarget은 KST 벽시계 시각으로 그대로 출발시각 계산에 들어간다.
    // 형식(HH:mm)만 맞고 값이 범위를 벗어나면 Date 연산이 조용히 다음 날로 넘어간다.
    const outOfRange = ['24:00', '99:99', '08:60', '30:15'];

    it.each(outOfRange)('생성 시 범위를 벗어난 %s를 거부한다', async (arrivalTarget) => {
      const props = await errorsFor(CreateSmartDepartureSettingDto, {
        routeId: ROUTE_ID,
        departureType: 'commute',
        arrivalTarget,
      });

      expect(props).toContain('arrivalTarget');
    });

    it.each(outOfRange)('수정 시 범위를 벗어난 %s를 거부한다', async (arrivalTarget) => {
      const props = await errorsFor(UpdateSmartDepartureSettingDto, { arrivalTarget });

      expect(props).toContain('arrivalTarget');
    });

    it.each(['00:00', '08:30', '23:59'])('정상 시각 %s는 통과시킨다', async (arrivalTarget) => {
      const props = await errorsFor(CreateSmartDepartureSettingDto, {
        routeId: ROUTE_ID,
        departureType: 'commute',
        arrivalTarget,
      });

      expect(props).not.toContain('arrivalTarget');
    });

    it('형식 자체가 틀린 값도 계속 거부한다', async () => {
      const props = await errorsFor(CreateSmartDepartureSettingDto, {
        routeId: ROUTE_ID,
        departureType: 'commute',
        arrivalTarget: '8:30',
      });

      expect(props).toContain('arrivalTarget');
    });
  });
});
