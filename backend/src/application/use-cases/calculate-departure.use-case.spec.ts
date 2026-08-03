import { CalculateDepartureUseCase } from './calculate-departure.use-case';
import { ISmartDepartureSettingRepository } from '@domain/repositories/smart-departure-setting.repository';
import { ISmartDepartureSnapshotRepository } from '@domain/repositories/smart-departure-snapshot.repository';
import { ICommuteRouteRepository } from '@domain/repositories/commute-route.repository';
import { ICommuteSessionRepository } from '@domain/repositories/commute-session.repository';
import {
  SmartDepartureSnapshot,
  SnapshotStatus,
} from '@domain/entities/smart-departure-snapshot.entity';
import type { DepartureType } from '@domain/entities/smart-departure-setting.entity';

describe('CalculateDepartureUseCase', () => {
  let useCase: CalculateDepartureUseCase;
  let settingRepo: jest.Mocked<ISmartDepartureSettingRepository>;
  let snapshotRepo: jest.Mocked<ISmartDepartureSnapshotRepository>;
  let routeRepo: jest.Mocked<ICommuteRouteRepository>;
  let sessionRepo: jest.Mocked<ICommuteSessionRepository>;

  beforeEach(() => {
    settingRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      findActiveByUserId: jest.fn(),
      findAllActive: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    snapshotRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findBySettingAndDate: jest.fn(),
      findTodayByUserId: jest.fn(),
      findTodayByUserAndType: jest.fn(),
      findByUserIdInDateRange: jest.fn(),
      update: jest.fn(),
      expireOldSnapshots: jest.fn(),
    };
    routeRepo = { findById: jest.fn() } as unknown as jest.Mocked<ICommuteRouteRepository>;
    sessionRepo = {
      findByUserIdInDateRange: jest.fn(),
    } as unknown as jest.Mocked<ICommuteSessionRepository>;

    useCase = new CalculateDepartureUseCase(
      settingRepo,
      snapshotRepo,
      routeRepo,
      sessionRepo,
    );
  });

  describe('getWidgetDepartureData', () => {
    /** optimalDepartureAt이 지금으로부터 offsetMin 분 뒤인 스냅샷 */
    function snapshotAt(
      offsetMin: number,
      options: { departureType?: DepartureType; status?: SnapshotStatus } = {},
    ): SmartDepartureSnapshot {
      return new SmartDepartureSnapshot(
        'user-1',
        `setting-${offsetMin}`,
        '2026-08-03',
        options.departureType ?? 'commute',
        '09:00',
        45,
        20,
        new Date(Date.now() + offsetMin * 60_000),
        { status: options.status ?? 'scheduled' },
      );
    }

    it('스냅샷이 없으면 null을 반환한다', async () => {
      snapshotRepo.findTodayByUserId.mockResolvedValue([]);

      expect(await useCase.getWidgetDepartureData('user-1')).toBeNull();
    });

    it('아직 오지 않은 출발이 있으면 그중 가장 이른 것을 고른다', async () => {
      snapshotRepo.findTodayByUserId.mockResolvedValue([
        snapshotAt(300, { departureType: 'return' }),
        snapshotAt(30, { departureType: 'commute' }),
      ]);

      const result = await useCase.getWidgetDepartureData('user-1');
      expect(result?.departureType).toBe('commute');
    });

    it('출발/취소된 스냅샷은 후보에서 제외한다', async () => {
      snapshotRepo.findTodayByUserId.mockResolvedValue([
        snapshotAt(30, { departureType: 'commute', status: 'departed' }),
        snapshotAt(60, { departureType: 'return', status: 'cancelled' }),
      ]);

      expect(await useCase.getWidgetDepartureData('user-1')).toBeNull();
    });

    // 회귀 방지: 남은 출발이 전부 지나갔을 때 오름차순 배열의 [0]을 고르면
    // "가장 최근"이 아니라 "가장 오래된" 출발이 잡힌다.
    it('남은 출발이 모두 지났으면 가장 최근에 지난 출발을 고른다', async () => {
      snapshotRepo.findTodayByUserId.mockResolvedValue([
        snapshotAt(-690, { departureType: 'commute' }), // 오늘 아침
        snapshotAt(-80, { departureType: 'return' }), // 오늘 저녁
      ]);

      const result = await useCase.getWidgetDepartureData('user-1');
      expect(result?.departureType).toBe('return');
      expect(result?.minutesUntilDeparture).toBeGreaterThanOrEqual(-81);
    });

    it('지난 출발만 있고 하나뿐이면 그것을 고른다', async () => {
      snapshotRepo.findTodayByUserId.mockResolvedValue([
        snapshotAt(-15, { departureType: 'commute' }),
      ]);

      const result = await useCase.getWidgetDepartureData('user-1');
      expect(result?.departureType).toBe('commute');
    });
  });

  describe('estimateTravelTime', () => {
    it('이력이 없으면 baseline + 실시간 보정을 쓴다', () => {
      expect(useCase.estimateTravelTime(40, null, 5)).toBe(45);
    });

    it('이력이 있으면 가중 결합한다 (baseline 20% + history 80%)', () => {
      // 30*0.2 + 40*0.5 + 40*0.3 = 6 + 20 + 12 = 38
      expect(useCase.estimateTravelTime(30, 40, 0)).toBe(38);
    });

    it('하한 5분 · 상한 120분으로 자른다', () => {
      expect(useCase.estimateTravelTime(1, null, 0)).toBe(5);
      expect(useCase.estimateTravelTime(500, null, 0)).toBe(120);
    });
  });
});
