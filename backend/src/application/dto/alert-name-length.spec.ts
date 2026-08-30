import { ValidationPipe } from '@nestjs/common';
import { CreateAlertDto } from './create-alert.dto';
import { UpdateAlertDto } from './update-alert.dto';

/**
 * 회귀 방지: `alerts.name`은 `VARCHAR(255)`인데(database/schema.sql) 두 DTO 모두
 * `@IsString()`만 걸고 길이를 재지 않았다. TypeORM 쪽도 `@Column()` 기본값이라
 * varchar(255)다.
 *
 * 그래서 256자 이름은 검증을 통과해 INSERT/UPDATE 까지 내려가고, Postgres가
 * `value too long for type character varying(255)`로 끊는다 — 400이 아니라 **500**이다.
 * 웹 수정 모달의 `catch`는 사유를 구분하지 않으므로 화면에는 "수정에 실패했습니다"만
 * 뜨고, 사용자는 이름이 길어서 막혔다는 사실을 알 방법이 없다.
 *
 * 길이는 DB 계약(255)에 맞춘다. 파이프를 실제로 통과시켜야 전역 검증이
 * 살아 있는지 확인된다.
 */
describe('알림 이름 길이 검증 (DB varchar(255) 계약)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const MAX = 255;
  const atLimit = 'a'.repeat(MAX);
  const overLimit = 'a'.repeat(MAX + 1);

  describe('UpdateAlertDto', () => {
    const metadata = { type: 'body' as const, metatype: UpdateAlertDto };

    it('255자 이름은 통과한다 (대조군)', async () => {
      const result = (await pipe.transform(
        { name: atLimit },
        metadata,
      )) as UpdateAlertDto;

      expect(result.name).toBe(atLimit);
    });

    it('256자 이름은 400으로 거절한다 (DB까지 내려가 500이 되지 않도록)', async () => {
      await expect(pipe.transform({ name: overLimit }, metadata)).rejects.toThrow();
    });
  });

  describe('CreateAlertDto', () => {
    const metadata = { type: 'body' as const, metatype: CreateAlertDto };

    const base = {
      userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f',
      schedule: '0 8 * * 1-5',
      alertTypes: ['weather'],
    };

    it('255자 이름은 통과한다 (대조군)', async () => {
      const result = (await pipe.transform(
        { ...base, name: atLimit },
        metadata,
      )) as CreateAlertDto;

      expect(result.name).toBe(atLimit);
    });

    it('256자 이름은 400으로 거절한다', async () => {
      await expect(
        pipe.transform({ ...base, name: overLimit }, metadata),
      ).rejects.toThrow();
    });
  });
});
