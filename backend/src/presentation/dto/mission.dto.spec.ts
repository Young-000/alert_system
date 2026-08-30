import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import {
  CreateMissionDto,
  ReorderMissionDto,
  UpdateMissionDto,
} from './mission.dto';

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

    /**
     * `missions.emoji`는 VARCHAR(10)이다(20260803_add_mission_challenge_cache_tables.sql:35).
     * Postgres varchar(n)은 문자(코드포인트)를 세지만 `MaxLength`는 UTF-16 코드유닛을 센다.
     * 11자 BMP 문자열은 코드유닛 11개라 상한 16을 통과하고, 코드포인트도 11개라
     * Postgres가 `value too long for type character varying(10)`으로 끊는다 — 400이 아니라 500이다.
     * 도메인 계층도 제목만 검사하므로(mission.entity.ts:16-20) 여기서 막지 않으면 막을 곳이 없다.
     */
    it('컬럼 폭(10자)을 넘는 emoji를 400으로 거부한다 (DB까지 내려가 500이 되지 않도록)', async () => {
      const body = { title: '독서하기', emoji: 'x'.repeat(11), missionType: 'commute' };

      await expect(
        pipe.transform(body, asBody(CreateMissionDto)),
      ).rejects.toThrow();
    });

    // 대조군: 상한을 코드유닛 10으로 낮추는 실수를 잡는다.
    // 👨‍👩‍👧‍👦는 코드유닛 11개지만 코드포인트는 7개라 varchar(10)에 들어간다 — 막으면 안 된다.
    it('ZWJ 결합 이모지는 코드유닛이 10을 넘어도 통과한다 (대조군)', async () => {
      const body = { title: '독서하기', emoji: '👨‍👩‍👧‍👦', missionType: 'commute' };

      await expect(
        pipe.transform(body, asBody(CreateMissionDto)),
      ).resolves.toMatchObject({ emoji: '👨‍👩‍👧‍👦' });
    });

    it('공백뿐인 제목은 400으로 거부한다', async () => {
      // IsNotEmpty는 ''만 막는다 — 공백은 통과해 엔티티에서 터지고 500이 된다.
      const body = { title: '   ', missionType: 'commute' };

      await expect(
        pipe.transform(body, asBody(CreateMissionDto)),
      ).rejects.toThrow();
    });

    it('제목 앞뒤 공백은 잘라서 넘긴다', async () => {
      const body = { title: '  독서하기  ', missionType: 'commute' };

      await expect(
        pipe.transform(body, asBody(CreateMissionDto)),
      ).resolves.toMatchObject({ title: '독서하기' });
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

    it('제목을 빼면 emoji만 수정할 수 있다', async () => {
      const body = { emoji: '🎧' };

      await expect(
        pipe.transform(body, asBody(UpdateMissionDto)),
      ).resolves.toMatchObject({ emoji: '🎧' });
    });

    it('컬럼 폭(10자)을 넘는 emoji로는 수정할 수 없다', async () => {
      const body = { emoji: 'x'.repeat(11) };

      await expect(
        pipe.transform(body, asBody(UpdateMissionDto)),
      ).rejects.toThrow();
    });

    // 대조군 — 수정 경로도 저장 가능한 ZWJ 이모지는 받아야 한다.
    it('ZWJ 결합 이모지로 수정할 수 있다 (대조군)', async () => {
      const body = { emoji: '👨‍👩‍👧‍👦' };

      await expect(
        pipe.transform(body, asBody(UpdateMissionDto)),
      ).resolves.toMatchObject({ emoji: '👨‍👩‍👧‍👦' });
    });

    it('빈 제목으로는 수정할 수 없다', async () => {
      const body = { title: '' };

      await expect(
        pipe.transform(body, asBody(UpdateMissionDto)),
      ).rejects.toThrow();
    });

    it('공백뿐인 제목으로는 수정할 수 없다', async () => {
      const body = { title: '   ' };

      await expect(
        pipe.transform(body, asBody(UpdateMissionDto)),
      ).rejects.toThrow();
    });
  });
  describe('ReorderMissionDto', () => {
    // sort_order는 Postgres INTEGER(int4) 컬럼이다
    // (20260803_add_mission_challenge_cache_tables.sql:38).
    // 통과한 값은 그대로 UPDATE에 실려 "integer out of range" 500이 된다.
    it.each(['1e15', '2147483648', '-2147483649'])(
      'int4 범위를 벗어난 %s를 거부한다',
      async (sortOrder) => {
        await expect(
          pipe.transform({ sortOrder }, asBody(ReorderMissionDto)),
        ).rejects.toThrow();
      },
    );

    // int4 최대값 자체는 저장에 성공하지만, 다음 미션 생성이 마지막 sort_order + 1을
    // 쓰므로(manage-mission.use-case.ts:61-64) 그 유형의 미션 생성이 계속 실패하게 된다.
    it('다음 값이 int4를 넘기는 경계값 2147483647을 거부한다', async () => {
      await expect(
        pipe.transform({ sortOrder: '2147483647' }, asBody(ReorderMissionDto)),
      ).rejects.toThrow();
    });

    // Postgres가 1.5를 2로 반올림해 기존 미션과 자리가 겹친다 — 목록 순서가 비결정적이 된다.
    it('소수를 거부한다', async () => {
      await expect(
        pipe.transform({ sortOrder: '1.5' }, asBody(ReorderMissionDto)),
      ).rejects.toThrow();
    });

    // 정렬 키에 음수가 들어가면 사용자가 만든 적 없는 배치가 된다.
    it('음수를 거부한다', async () => {
      await expect(
        pipe.transform({ sortOrder: '-1' }, asBody(ReorderMissionDto)),
      ).rejects.toThrow();
    });

    // 프론트는 서버가 준 sort_order끼리 맞바꾼다(MissionSettingsPage.tsx:382-383).
    it.each(['0', '2', '2147483646'])('정상 값 %s는 통과한다', async (sortOrder) => {
      await expect(
        pipe.transform({ sortOrder }, asBody(ReorderMissionDto)),
      ).resolves.toMatchObject({ sortOrder: Number(sortOrder) });
    });
  });
});
