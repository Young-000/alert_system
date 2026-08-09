import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { BriefingController } from './briefing.controller';
import { WidgetDataService } from '@application/services/widget-data.service';
import { BriefingAdviceService } from '@application/services/briefing-advice.service';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

/** main.ts:63-72의 전역 파이프와 동일한 설정. 여기서 재현해야 계약이 검증된다. */
const globalPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

/** 컨트롤러가 실제로 선언한 쿼리 DTO를 파라미터 메타데이터에서 그대로 꺼낸다. */
function declaredQueryDto(): new () => object {
  const paramTypes = Reflect.getMetadata(
    'design:paramtypes',
    BriefingController.prototype,
    'getBriefing',
  ) as Array<new () => object>;
  return paramTypes[0];
}

const emptyWidgetData = {
  weather: null,
  airQuality: null,
  alerts: [],
  transit: { subway: null, bus: null },
  departure: null,
};

describe('BriefingController', () => {
  let controller: BriefingController;
  let widgetDataService: { getData: jest.Mock };

  const request = { user: { userId: 'user-1' } } as AuthenticatedRequest;

  beforeEach(async () => {
    widgetDataService = { getData: jest.fn().mockResolvedValue(emptyWidgetData) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BriefingController],
      providers: [
        { provide: WidgetDataService, useValue: widgetDataService },
        BriefingAdviceService,
      ],
    }).compile();

    controller = module.get(BriefingController);
  });

  describe('쿼리 DTO는 전역 ValidationPipe를 통과해야 한다', () => {
    it('lat/lng를 실은 요청이 400으로 거부되지 않는다', async () => {
      // 프론트(use-briefing-query.ts)는 항상 lat/lng를 붙여 호출한다.
      // DTO에 검증 데코레이터가 하나도 없으면 whitelist가 두 필드를 비화이트리스트로 보고
      // forbidNonWhitelisted가 400을 던진다 — 엔드포인트가 통째로 죽는다.
      await expect(
        globalPipe.transform(
          { lat: '37.5665', lng: '126.9780' },
          { type: 'query', metatype: declaredQueryDto() },
        ),
      ).resolves.toEqual({ lat: '37.5665', lng: '126.9780' });
    });

    it('파라미터 없는 요청도 통과한다', async () => {
      await expect(
        globalPipe.transform({}, { type: 'query', metatype: declaredQueryDto() }),
      ).resolves.toEqual({});
    });

    it('DTO에 없는 파라미터는 여전히 거부한다', async () => {
      await expect(
        globalPipe.transform(
          { unexpected: 'x' },
          { type: 'query', metatype: declaredQueryDto() },
        ),
      ).rejects.toThrow();
    });
  });

  describe('좌표 파싱', () => {
    it('유효한 좌표는 그대로 서비스에 전달한다', async () => {
      await controller.getBriefing({ lat: '37.5665', lng: '126.9780' }, request);

      expect(widgetDataService.getData).toHaveBeenCalledWith('user-1', 37.5665, 126.978);
    });

    it('숫자가 아닌 좌표는 undefined로 폴백한다 (서비스가 기본 좌표를 쓴다)', async () => {
      await controller.getBriefing({ lat: 'abc', lng: 'def' }, request);

      expect(widgetDataService.getData).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('범위를 벗어난 좌표는 undefined로 폴백한다', async () => {
      await controller.getBriefing({ lat: '999', lng: '-500' }, request);

      expect(widgetDataService.getData).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('좌표가 없으면 undefined로 전달한다', async () => {
      await controller.getBriefing({}, request);

      expect(widgetDataService.getData).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('경계값(±90 / ±180)은 유효한 좌표로 통과시킨다', async () => {
      await controller.getBriefing({ lat: '-90', lng: '180' }, request);

      expect(widgetDataService.getData).toHaveBeenCalledWith('user-1', -90, 180);
    });
  });

  describe('응답', () => {
    it('브리핑 조언과 위젯 데이터를 함께 돌려준다', async () => {
      const result = await controller.getBriefing({}, request);

      expect(result).toMatchObject({
        advices: expect.any(Array),
        weather: null,
        airQuality: null,
        contextLabel: expect.any(String),
        summary: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
  });
});
