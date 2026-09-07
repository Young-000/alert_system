import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAlertDto } from './create-alert.dto';
import { UpdateAlertDto } from './update-alert.dto';

/**
 * `alertTypes`가 비면 알림은 **내용 없이 발송된다.**
 *
 * `SendNotificationUseCase`는 타입별로 데이터를 모은다
 * (`send-notification.use-case.ts:135·143·155·176`). 배열이 비면 네 분기가 모두
 * 건너뛰어져 날씨도 교통도 담기지 않는데, `schedule`과 `enabled`는 그대로라
 * **크론은 정시에 발화하고 알림톡만 빈 채로 나간다** (발송은 건당 과금이다).
 *
 * 생성은 `@ArrayMinSize(1)`로 이걸 막는다. 수정에 같은 상한이 없으면
 * `PATCH {alertTypes: []}` 한 번으로 우회된다 — `update-alert.dto.ts`가 이미
 * `schedule`에 대해 "한쪽만 막으면 수정으로 우회된다"고 적어 둔 것과 같은 축이다.
 * (`UpdateAlertUseCase`는 `dto.alertTypes !== undefined`면 그대로 대입한다: :45)
 */
async function invalidProps<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, payload));
  return errors.map((e) => e.property);
}

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('alertTypes 최소 개수 계약', () => {
  it('생성은 빈 alertTypes를 거부한다', async () => {
    const props = await invalidProps(CreateAlertDto, {
      userId: USER_ID,
      name: '출근 알림',
      schedule: '0 7 * * 1-5',
      alertTypes: [],
    });

    expect(props).toContain('alertTypes');
  });

  it('수정도 빈 alertTypes를 거부한다 — 생성과 같은 상한', async () => {
    const props = await invalidProps(UpdateAlertDto, { alertTypes: [] });

    expect(props).toContain('alertTypes');
  });

  it('수정에서 alertTypes를 아예 보내지 않는 것은 허용한다', async () => {
    const props = await invalidProps(UpdateAlertDto, { name: '이름만 수정' });

    expect(props).not.toContain('alertTypes');
  });

  it('수정에서 타입이 하나라도 있으면 통과한다', async () => {
    const props = await invalidProps(UpdateAlertDto, { alertTypes: ['weather'] });

    expect(props).not.toContain('alertTypes');
  });
});
