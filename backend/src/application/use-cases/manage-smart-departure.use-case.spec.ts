import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ManageSmartDepartureUseCase } from './manage-smart-departure.use-case';
import { SMART_DEPARTURE_SETTING_REPOSITORY } from '@domain/repositories/smart-departure-setting.repository';
import { COMMUTE_ROUTE_REPOSITORY } from '@domain/repositories/commute-route.repository';
import { SmartDepartureSetting } from '@domain/entities/smart-departure-setting.entity';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const ROUTE_ID = 'route-1';
const SETTING_ID = 'setting-1';

describe('ManageSmartDepartureUseCase', () => {
  let useCase: ManageSmartDepartureUseCase;
  let settingRepo: {
    save: jest.Mock;
    findById: jest.Mock;
    findByUserId: jest.Mock;
    findByUserIdAndType: jest.Mock;
    findActiveByUserId: jest.Mock;
    findAllActive: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let routeRepo: { findById: jest.Mock };

  function existingSetting(): SmartDepartureSetting {
    return new SmartDepartureSetting(USER_ID, ROUTE_ID, 'commute', '09:00', {
      id: SETTING_ID,
    });
  }

  beforeEach(async () => {
    settingRepo = {
      save: jest.fn((s) => Promise.resolve(s)),
      findById: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue([]),
      findByUserIdAndType: jest.fn().mockResolvedValue(undefined),
      findActiveByUserId: jest.fn().mockResolvedValue([]),
      findAllActive: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    routeRepo = {
      findById: jest.fn().mockResolvedValue({ id: ROUTE_ID, userId: USER_ID }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManageSmartDepartureUseCase,
        { provide: SMART_DEPARTURE_SETTING_REPOSITORY, useValue: settingRepo },
        { provide: COMMUTE_ROUTE_REPOSITORY, useValue: routeRepo },
      ],
    }).compile();

    useCase = module.get(ManageSmartDepartureUseCase);
  });

  describe('createSetting', () => {
    it('설정을 저장하고 응답 DTO를 만든다', async () => {
      const result = await useCase.createSetting(USER_ID, {
        routeId: ROUTE_ID,
        departureType: 'commute',
        arrivalTarget: '09:00',
      });

      expect(settingRepo.save).toHaveBeenCalledTimes(1);
      expect(result.arrivalTarget).toBe('09:00');
      expect(result.isEnabled).toBe(true);
    });

    it('같은 타입 설정이 이미 있으면 409', async () => {
      settingRepo.findByUserIdAndType.mockResolvedValue(existingSetting());

      await expect(
        useCase.createSetting(USER_ID, {
          routeId: ROUTE_ID,
          departureType: 'commute',
          arrivalTarget: '09:00',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('남의 경로를 지정하면 403', async () => {
      routeRepo.findById.mockResolvedValue({ id: ROUTE_ID, userId: OTHER_USER_ID });

      await expect(
        useCase.createSetting(USER_ID, {
          routeId: ROUTE_ID,
          departureType: 'commute',
          arrivalTarget: '09:00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    // 형식은 HH:mm이지만 값이 범위를 벗어난 시각. 도메인이 막긴 하지만
    // 평범한 Error라 500으로 나가던 자리다 — 사용자 입력 오류는 400이어야 한다.
    it('범위를 벗어난 arrivalTarget은 400으로 거부한다', async () => {
      await expect(
        useCase.createSetting(USER_ID, {
          routeId: ROUTE_ID,
          departureType: 'commute',
          arrivalTarget: '99:99',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(settingRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateSetting', () => {
    beforeEach(() => {
      settingRepo.findById.mockResolvedValue(existingSetting());
    });

    it('시각을 바꾸면 저장한다', async () => {
      const result = await useCase.updateSetting(SETTING_ID, USER_ID, {
        arrivalTarget: '10:15',
      });

      expect(settingRepo.update).toHaveBeenCalledTimes(1);
      expect(result.arrivalTarget).toBe('10:15');
    });

    // 이 값이 저장되면 출발시각 계산(atTimeKST)이 며칠 뒤로 넘어간다.
    it('범위를 벗어난 arrivalTarget은 400으로 거부하고 저장하지 않는다', async () => {
      await expect(
        useCase.updateSetting(SETTING_ID, USER_ID, { arrivalTarget: '99:99' }),
      ).rejects.toThrow(BadRequestException);

      expect(settingRepo.update).not.toHaveBeenCalled();
    });

    it('남의 설정은 403', async () => {
      settingRepo.findById.mockResolvedValue(
        new SmartDepartureSetting(OTHER_USER_ID, ROUTE_ID, 'commute', '09:00', {
          id: SETTING_ID,
        }),
      );

      await expect(
        useCase.updateSetting(SETTING_ID, USER_ID, { arrivalTarget: '10:15' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('없는 설정은 404', async () => {
      settingRepo.findById.mockResolvedValue(undefined);

      await expect(
        useCase.updateSetting(SETTING_ID, USER_ID, { arrivalTarget: '10:15' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleSetting', () => {
    it('활성 상태를 뒤집어 저장한다', async () => {
      settingRepo.findById.mockResolvedValue(existingSetting());

      const result = await useCase.toggleSetting(SETTING_ID, USER_ID);

      expect(result.isEnabled).toBe(false);
      expect(settingRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteSetting', () => {
    it('남의 설정은 지우지 않는다', async () => {
      settingRepo.findById.mockResolvedValue(
        new SmartDepartureSetting(OTHER_USER_ID, ROUTE_ID, 'commute', '09:00', {
          id: SETTING_ID,
        }),
      );

      await expect(useCase.deleteSetting(SETTING_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
      expect(settingRepo.delete).not.toHaveBeenCalled();
    });
  });
});
