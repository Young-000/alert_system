import { ValidationPipe } from '@nestjs/common';
import { CreateAlertDto } from './create-alert.dto';
import { UpdateAlertDto } from './update-alert.dto';
import { CreateRouteDto, UpdateRouteDto } from './commute.dto';
import {
  CreateSmartDepartureSettingDto,
  UpdateSmartDepartureSettingDto,
} from './smart-departure.dto';

/**
 * 회귀 방지: 배열 DTO 필드에 **하한만 있고 상한이 없다.**
 *
 * 앞선 라운드가 판 축은 `@ArrayMinSize` 였다 — 빈 배열이 저장되면 내용 없는 알림톡이
 * 건당 과금되며 나간다는 이유로 `alertTypes` 양쪽에 하한을 넣었다(update-alert.dto:46 주석).
 * 그 스윕은 **하한만** 봤다. 같은 필드의 **형제인 상한**은 그대로 비어 있다.
 *
 * 상한이 필요한 근거는 이 리포가 이미 스스로 적어 뒀다 — `commute-event.dto.ts:54`는
 * `@ArrayMaxSize(50)`으로 배치 이벤트를 막는다. 같은 판단이 아래 6필드엔 적용되지 않았다.
 *
 * | DTO 필드 | 원소 도메인 | 도메인이 허용하는 서로 다른 값 | 현재 상한 |
 * |---|---|---|---|
 * | `CreateAlertDto.alertTypes` | `AlertType` (4개) | 4 | 없음 |
 * | `UpdateAlertDto.alertTypes` | `AlertType` (4개) | 4 | 없음 |
 * | `CreateSmartDepartureSettingDto.activeDays` | `@Min(0) @Max(6)` | 7 | 없음 |
 * | `UpdateSmartDepartureSettingDto.activeDays` | `@Min(0) @Max(6)` | 7 | 없음 |
 * | `CreateSmartDepartureSettingDto.preAlerts` | `@Min(0) @Max(30)` | 31 | 없음 |
 * | `UpdateSmartDepartureSettingDto.preAlerts` | `@Min(0) @Max(30)` | 31 | 없음 |
 * | `CreateRouteDto.checkpoints` | 중첩 객체 | — | 없음 |
 * | `UpdateRouteDto.checkpoints` | 중첩 객체 | — | 없음 |
 *
 * 앞 6필드는 **원소 도메인 자체가 배열 길이를 묶는다.** `activeDays`가 0~6만 받는데
 * 길이 제한이 없으면 `[1,1,1,…]` 수천 개가 검증을 통과해 그대로 컬럼에 저장된다.
 * 중복은 읽는 쪽이 전부 `includes()`/`has()`로 쓰므로 **동작을 바꾸지는 않는다** —
 * 증상 없이 행만 부푼다. 그래서 테스트 없이는 드러나지 않는 종류의 구멍이다.
 *
 * `checkpoints`는 성격이 다르다. 원소가 중첩 객체이고 각 원소가 `route_checkpoints`의
 * **한 행으로 INSERT** 된다. 상한이 없으면 요청 하나가 임의 개수의 행을 만든다.
 * 이 리포의 프로덕션 use-case에는 트랜잭션이 없어(기존 관측) 중간 실패 시 일부만 남는다.
 * 배치 이벤트와 같은 50으로 맞춘다 — 실제 출퇴근 경로는 3~5개다.
 */
describe('배열 DTO 상한 계약 (@ArrayMaxSize)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const expectRejected = async (
    value: unknown,
    metatype: new () => object,
  ): Promise<string> => {
    try {
      await pipe.transform(value, { type: 'body', metatype });
    } catch (error) {
      const response = (error as { getResponse: () => { message: string[] } }).getResponse();
      return response.message.join(' | ');
    }
    throw new Error('상한을 넘겼는데 통과했다 — 검증이 없다는 뜻이다.');
  };

  describe('alertTypes — AlertType은 4종뿐이다', () => {
    const baseCreate = {
      userId: '11111111-1111-4111-8111-111111111111',
      name: '출근 알림',
      schedule: '30 7 * * 1-5',
    };

    it('4종을 모두 담은 배열은 통과한다 (대조군)', async () => {
      const result = (await pipe.transform(
        { ...baseCreate, alertTypes: ['weather', 'airQuality', 'bus', 'subway'] },
        { type: 'body', metatype: CreateAlertDto },
      )) as CreateAlertDto;

      expect(result.alertTypes).toHaveLength(4);
    });

    it('CreateAlertDto: 5개를 넘는 alertTypes는 거절한다', async () => {
      const message = await expectRejected(
        { ...baseCreate, alertTypes: Array(200).fill('weather') },
        CreateAlertDto,
      );

      expect(message).toMatch(/알림 타입/);
    });

    it('UpdateAlertDto: 상한이 생성과 같다 — 한쪽만 막으면 수정으로 우회된다', async () => {
      const message = await expectRejected(
        { alertTypes: Array(200).fill('weather') },
        UpdateAlertDto,
      );

      expect(message).toMatch(/알림 유형|알림 타입/);
    });
  });

  describe('activeDays — 0~6, 즉 서로 다른 값이 7개뿐이다', () => {
    const baseCreate = {
      routeId: '22222222-2222-4222-8222-222222222222',
      departureType: 'commute',
      arrivalTarget: '09:00',
    };

    it('일주일 7일을 모두 담은 배열은 통과한다 (대조군)', async () => {
      const result = (await pipe.transform(
        { ...baseCreate, activeDays: [0, 1, 2, 3, 4, 5, 6] },
        { type: 'body', metatype: CreateSmartDepartureSettingDto },
      )) as CreateSmartDepartureSettingDto;

      expect(result.activeDays).toHaveLength(7);
    });

    it('CreateSmartDepartureSettingDto: 7개를 넘는 activeDays는 거절한다', async () => {
      const message = await expectRejected(
        { ...baseCreate, activeDays: Array(500).fill(1) },
        CreateSmartDepartureSettingDto,
      );

      expect(message).toMatch(/요일/);
    });

    it('UpdateSmartDepartureSettingDto: 상한이 생성과 같다', async () => {
      const message = await expectRejected(
        { activeDays: Array(500).fill(1) },
        UpdateSmartDepartureSettingDto,
      );

      expect(message).toMatch(/요일/);
    });
  });

  describe('preAlerts — 0~30, 즉 서로 다른 값이 31개뿐이다', () => {
    it('CreateSmartDepartureSettingDto: 31개를 넘는 preAlerts는 거절한다', async () => {
      const message = await expectRejected(
        {
          routeId: '22222222-2222-4222-8222-222222222222',
          departureType: 'commute',
          arrivalTarget: '09:00',
          preAlerts: Array(500).fill(10),
        },
        CreateSmartDepartureSettingDto,
      );

      expect(message).toMatch(/사전 알림/);
    });

    it('UpdateSmartDepartureSettingDto: 상한이 생성과 같다', async () => {
      const message = await expectRejected(
        { preAlerts: Array(500).fill(10) },
        UpdateSmartDepartureSettingDto,
      );

      expect(message).toMatch(/사전 알림/);
    });
  });

  describe('checkpoints — 원소 하나가 route_checkpoints 한 행이 된다', () => {
    const checkpoint = (sequenceOrder: number): Record<string, unknown> => ({
      sequenceOrder,
      name: `체크포인트 ${sequenceOrder}`,
      checkpointType: 'custom',
    });

    const baseCreate = {
      userId: '11111111-1111-4111-8111-111111111111',
      name: '출근 경로',
      routeType: 'morning',
    };

    it('50개까지는 통과한다 (대조군 — 배치 이벤트와 같은 상한)', async () => {
      const result = (await pipe.transform(
        {
          ...baseCreate,
          checkpoints: Array.from({ length: 50 }, (_, i) => checkpoint(i)),
        },
        { type: 'body', metatype: CreateRouteDto },
      )) as CreateRouteDto;

      expect(result.checkpoints).toHaveLength(50);
    });

    it('CreateRouteDto: 51개 이상의 checkpoints는 거절한다', async () => {
      const message = await expectRejected(
        {
          ...baseCreate,
          checkpoints: Array.from({ length: 51 }, (_, i) => checkpoint(i)),
        },
        CreateRouteDto,
      );

      expect(message).toMatch(/체크포인트/);
    });

    it('UpdateRouteDto: 상한이 생성과 같다', async () => {
      const message = await expectRejected(
        { checkpoints: Array.from({ length: 51 }, (_, i) => checkpoint(i)) },
        UpdateRouteDto,
      );

      expect(message).toMatch(/체크포인트/);
    });
  });
});
