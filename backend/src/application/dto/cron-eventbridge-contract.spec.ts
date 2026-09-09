import { ValidationPipe } from '@nestjs/common';
import { CreateAlertDto } from './create-alert.dto';
import { UpdateAlertDto } from './update-alert.dto';

/**
 * 회귀 방지: `CronExpressionValidator`는 cron-parser가 파싱하기만 하면 통과시킨다.
 * 그런데 스케줄을 실제로 등록하는 `EventBridgeSchedulerService`는 그보다 **좁은**
 * 집합만 변환할 수 있다 — 5필드 / `cron(...)`·`rate(...)` / `HH:mm` 뿐이고,
 * 나머지는 `Invalid schedule format`으로 던진다.
 *
 * 그 틈에 걸리는 값(초 필드를 포함한 6필드, `@daily` 같은 매크로)은 DTO를 통과해
 * 알림 행이 저장된 뒤 스케줄 등록에서 터진다. `CreateAlertUseCase`가 행을 롤백하고
 * 예외를 그대로 올리므로 응답은 **400이 아니라 500**이다. 사용자에게는 어떤 값이
 * 문제였는지 알려주지 못한다.
 *
 * 두 집합은 같아야 한다: **DTO가 통과시키는 스케줄 = 스케줄러가 등록할 수 있는 스케줄.**
 */
describe('스케줄 검증이 EventBridge 변환 가능 범위와 일치한다', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const baseCreate = {
    userId: '11111111-1111-4111-8111-111111111111',
    name: '출근 알림',
    alertTypes: ['weather'],
  };

  async function createRejects(schedule: string): Promise<boolean> {
    try {
      await pipe.transform(
        { ...baseCreate, schedule },
        { type: 'body', metatype: CreateAlertDto },
      );
      return false;
    } catch {
      return true;
    }
  }

  async function updateRejects(schedule: string): Promise<boolean> {
    try {
      await pipe.transform({ schedule }, { type: 'body', metatype: UpdateAlertDto });
      return false;
    } catch {
      return true;
    }
  }

  // EventBridge 변환이 던지는 값들. cron-parser는 전부 통과시킨다.
  const NOT_CONVERTIBLE = [
    ['초 필드를 포함한 6필드', '0 0 8 * * *'],
    ['매크로 @daily', '@daily'],
    ['매크로 @hourly', '@hourly'],
  ];

  describe('변환할 수 없는 스케줄은 400으로 거절한다', () => {
    for (const [label, schedule] of NOT_CONVERTIBLE) {
      it(`${label}: ${schedule}`, async () => {
        expect(await createRejects(schedule)).toBe(true);
      });

      it(`${label} — 수정 경로도 같이 막는다 (한쪽만 막으면 우회된다)`, async () => {
        expect(await updateRejects(schedule)).toBe(true);
      });
    }
  });

  // 대조군: 화면이 실제로 만들어 보내는 형태들이다. 과잉 차단이면 알림을 못 만든다.
  const CONVERTIBLE = [
    ['매일 08:00', '0 8 * * *'],
    ['출근·퇴근 두 시각', '0 7,18 * * *'],
    ['평일만', '0 8 * * 1-5'],
    ['주말만', '0 9 * * 0,6'],
    ['분 단위 스텝', '*/5 * * * *'],
    ['경로 저장이 만드는 아침 알림', '0 7 * * *'],
    ['경로 저장이 만드는 저녁 알림', '30 17 * * *'],
  ];

  describe('화면이 만드는 스케줄은 그대로 통과한다 (대조군)', () => {
    for (const [label, schedule] of CONVERTIBLE) {
      it(`${label}: ${schedule}`, async () => {
        expect(await createRejects(schedule)).toBe(false);
      });
    }
  });

  it('시각 필드가 빠진 4필드도 거절한다', async () => {
    // 웹 위저드가 루틴 시각을 비운 채 저장하면 만들던 값이다(프론트에서도 함께 막았다).
    expect(await createRejects('0  * * *')).toBe(true);
  });
});
