import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { CreateMissionDto, UpdateMissionDto } from './mission.dto';

/**
 * main.ts의 전역 ValidationPipe와 동일한 설정.
 * forbidNonWhitelisted 때문에 DTO에 없는 속성은 400이 되므로,
 * 프론트가 실제로 보내는 body를 그대로 태워 계약을 검증한다.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const asBody = (metatype: new () => object): ArgumentMetadata => ({
  type: 'body',
  metatype,
});

describe('Mission DTO ↔ 프론트 전송 body 계약', () => {
  describe('CreateMissionDto', () => {
    it('프론트가 고른 emoji를 받아들인다', async () => {
      // MissionAddModal이 실제로 보내는 body (title·emoji·missionType)
      const body = { title: '독서하기', emoji: '📚', missionType: 'commute' };

      await expect(
        pipe.transform(body, asBody(CreateMissionDto)),
      ).resolves.toMatchObject({ title: '독서하기', emoji: '📚' });
    });

    it('emoji 없이도 생성할 수 있다', async () => {
      const body = { title: '독서하기', missionType: 'commute' };

      await expect(
        pipe.transform(body, asBody(CreateMissionDto)),
      ).resolves.toMatchObject({ title: '독서하기' });
    });

    it('emoji가 지나치게 길면 거부한다', async () => {
      const body = { title: '독서하기', emoji: 'x'.repeat(64), missionType: 'commute' };

      await expect(
        pipe.transform(body, asBody(CreateMissionDto)),
      ).rejects.toThrow();
    });
  });

  describe('UpdateMissionDto', () => {
    it('프론트가 고친 emoji를 받아들인다', async () => {
      // MissionSettingsPage.handleSave가 수정 시 보내는 body
      const body = { title: '독서하기', emoji: '🎧' };

      await expect(
        pipe.transform(body, asBody(UpdateMissionDto)),
      ).resolves.toMatchObject({ title: '독서하기', emoji: '🎧' });
    });
  });
});
