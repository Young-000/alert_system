// `commute.dto.ts`의 `@Type()`은 Reflect 메타데이터를 읽는다. 다른 spec은
// `@nestjs/common`을 먼저 import해 부수효과로 이걸 얻지만, 여기서는 명시한다.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAlertDto } from './update-alert.dto';
import { UpdatePlaceDto } from './update-place.dto';
import { CreateAlertDto } from './create-alert.dto';
import { CreatePlaceDto } from './create-place.dto';
import { CreateRouteDto, UpdateRouteDto } from './commute.dto';

/**
 * 이름·라벨이 **빈 문자열**로 저장되는 경로를 막는다.
 *
 * 세 자원 모두 생성은 `@IsNotEmpty()`로 `''`를 거부하는데
 * (`create-alert.dto.ts:58`·`create-place.dto.ts:18`·`commute.dto.ts:97`),
 * 수정 DTO에는 같은 하한이 없어 `PATCH {name: ''}` 한 번으로 우회됐다.
 * 도메인 계층도 받은 값을 그대로 대입한다:
 *
 * | 자원 | 대입 지점 |
 * |---|---|
 * | 알림 | `update-alert.use-case.ts:40` → `alert.entity.ts:185` (`_name = name`) |
 * | 경로 | `manage-route.use-case.ts:181` (`dto.name ?? existing.name` — `''`는 nullish가 아니다) |
 * | 장소 | `user-place.entity.ts:69` (`fields.label ?? this.label` — 같은 이유) |
 *
 * 결과는 이름 칸이 빈 목록 행이다. 사용자는 어느 알림·경로·장소인지 구분할
 * 수 없고, 지우려 해도 무엇을 지우는지 확인할 방법이 없다.
 *
 * `update-alert.dto.ts:28`이 이미 적어 둔 원칙과 같은 축이다 —
 * **"생성 경로와 같은 상한 — 한쪽만 막으면 수정으로 우회된다."**
 * 길이 상한과 배열 하한 축은 앞선 라운드에서 닫혔고, 여기서 닫는 것은
 * **빈 문자열 축**이다.
 */
async function invalidProps<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, payload));
  return errors.map((e) => e.property);
}

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('빈 이름 계약 — 생성과 수정이 같은 하한을 쓴다', () => {
  describe('알림 이름', () => {
    it('생성은 빈 이름을 거부한다', async () => {
      const props = await invalidProps(CreateAlertDto, {
        userId: USER_ID,
        name: '',
        schedule: '0 7 * * 1-5',
        alertTypes: ['weather'],
      });

      expect(props).toContain('name');
    });

    it('수정도 빈 이름을 거부한다 — 생성과 같은 하한', async () => {
      const props = await invalidProps(UpdateAlertDto, { name: '' });

      expect(props).toContain('name');
    });

    it('공백만 있는 이름도 거부한다 — 목록에서는 빈 칸과 구분되지 않는다', async () => {
      const props = await invalidProps(UpdateAlertDto, { name: '   ' });

      expect(props).toContain('name');
    });

    it('이름을 아예 보내지 않는 것은 허용한다', async () => {
      const props = await invalidProps(UpdateAlertDto, { enabled: false });

      expect(props).not.toContain('name');
    });

    it('정상 이름은 통과한다', async () => {
      const props = await invalidProps(UpdateAlertDto, { name: '출근 알림' });

      expect(props).not.toContain('name');
    });
  });

  describe('경로 이름', () => {
    it('생성은 빈 이름을 거부한다', async () => {
      const props = await invalidProps(CreateRouteDto, {
        userId: USER_ID,
        name: '',
        routeType: 'commute',
        checkpoints: [
          { sequenceOrder: 0, name: '집', checkpointType: 'origin' },
        ],
      });

      expect(props).toContain('name');
    });

    it('수정도 빈 이름을 거부한다 — 생성과 같은 하한', async () => {
      const props = await invalidProps(UpdateRouteDto, { name: '' });

      expect(props).toContain('name');
    });

    it('이름을 아예 보내지 않는 것은 허용한다', async () => {
      const props = await invalidProps(UpdateRouteDto, { isPreferred: true });

      expect(props).not.toContain('name');
    });

    it('정상 이름은 통과한다', async () => {
      const props = await invalidProps(UpdateRouteDto, { name: '출근길' });

      expect(props).not.toContain('name');
    });
  });

  describe('장소 라벨', () => {
    it('생성은 빈 라벨을 거부한다', async () => {
      const props = await invalidProps(CreatePlaceDto, {
        placeType: 'home',
        label: '',
        latitude: 37.5,
        longitude: 127.0,
      });

      expect(props).toContain('label');
    });

    it('수정도 빈 라벨을 거부한다 — 생성과 같은 하한', async () => {
      const props = await invalidProps(UpdatePlaceDto, { label: '' });

      expect(props).toContain('label');
    });

    it('라벨을 아예 보내지 않는 것은 허용한다', async () => {
      const props = await invalidProps(UpdatePlaceDto, { radiusM: 300 });

      expect(props).not.toContain('label');
    });

    it('정상 라벨은 통과한다', async () => {
      const props = await invalidProps(UpdatePlaceDto, { label: '우리집' });

      expect(props).not.toContain('label');
    });
  });
});
