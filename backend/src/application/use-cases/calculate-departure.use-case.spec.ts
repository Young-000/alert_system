import { CalculateDepartureUseCase } from './calculate-departure.use-case';
import { ISmartDepartureSettingRepository } from '@domain/repositories/smart-departure-setting.repository';
import { ISmartDepartureSnapshotRepository } from '@domain/repositories/smart-departure-snapshot.repository';
import { ICommuteRouteRepository } from '@domain/repositories/commute-route.repository';
import { ICommuteSessionRepository } from '@domain/repositories/commute-session.repository';
import {
  SmartDepartureSnapshot,
  SnapshotStatus,
} from '@domain/entities/smart-departure-snapshot.entity';
import {
  SmartDepartureSetting,
  type DepartureType,
} from '@domain/entities/smart-departure-setting.entity';
import { getDayOfWeekKST } from '@domain/utils/kst-date';

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

  /**
   * 스냅샷을 만든 설정. 기본값은 "켜져 있고 오늘이 활성 요일".
   *
   * `findActiveByUserId`는 저장소에서 이미 `isEnabled: true`로 거르므로,
   * **꺼진 설정은 이 목록에서 빠지는 것**으로 재현한다.
   */
  function settingFor(
    snapshot: SmartDepartureSnapshot,
    options: { activeDays?: number[] } = {},
  ): SmartDepartureSetting {
    return new SmartDepartureSetting(
      snapshot.userId,
      'route-1',
      snapshot.departureType,
      snapshot.arrivalTarget,
      {
        id: snapshot.settingId,
        activeDays: options.activeDays ?? [0, 1, 2, 3, 4, 5, 6],
      },
    );
  }

  /**
   * 오늘의 스냅샷과 **그것을 만든 설정**을 함께 세운다.
   *
   * 읽기 경로가 설정을 다시 확인하므로(꺼진 설정의 스냅샷을 거르기 위함)
   * 스냅샷만 세우면 후보가 0이 된다.
   */
  function mockToday(snapshots: SmartDepartureSnapshot[]): void {
    snapshotRepo.findTodayByUserId.mockResolvedValue(snapshots);
    settingRepo.findActiveByUserId.mockResolvedValue(
      snapshots.map((s) => settingFor(s)),
    );
  }

  describe('getWidgetDepartureData', () => {

    it('스냅샷이 없으면 null을 반환한다', async () => {
      mockToday([]);

      expect(await useCase.getWidgetDepartureData('user-1')).toBeNull();
    });

    it('아직 오지 않은 출발이 있으면 그중 가장 이른 것을 고른다', async () => {
      mockToday([
        snapshotAt(300, { departureType: 'return' }),
        snapshotAt(30, { departureType: 'commute' }),
      ]);

      const result = await useCase.getWidgetDepartureData('user-1');
      expect(result?.departureType).toBe('commute');
    });

    it('출발/취소된 스냅샷은 후보에서 제외한다', async () => {
      mockToday([
        snapshotAt(30, { departureType: 'commute', status: 'departed' }),
        snapshotAt(60, { departureType: 'return', status: 'cancelled' }),
      ]);

      expect(await useCase.getWidgetDepartureData('user-1')).toBeNull();
    });

    // 회귀 방지: 남은 출발이 전부 지나갔을 때 오름차순 배열의 [0]을 고르면
    // "가장 최근"이 아니라 "가장 오래된" 출발이 잡힌다.
    it('남은 출발이 모두 지났으면 가장 최근에 지난 출발을 고른다', async () => {
      mockToday([
        snapshotAt(-690, { departureType: 'commute' }), // 오늘 아침
        snapshotAt(-80, { departureType: 'return' }), // 오늘 저녁
      ]);

      const result = await useCase.getWidgetDepartureData('user-1');
      expect(result?.departureType).toBe('return');
      expect(result?.minutesUntilDeparture).toBeGreaterThanOrEqual(-81);
    });

    it('지난 출발만 있고 하나뿐이면 그것을 고른다', async () => {
      mockToday([
        snapshotAt(-15, { departureType: 'commute' }),
      ]);

      const result = await useCase.getWidgetDepartureData('user-1');
      expect(result?.departureType).toBe('commute');
    });

    it('꺼진 설정의 스냅샷은 위젯에서도 제외한다', async () => {
      snapshotRepo.findTodayByUserId.mockResolvedValue([snapshotAt(30)]);
      settingRepo.findActiveByUserId.mockResolvedValue([]);

      expect(await useCase.getWidgetDepartureData('user-1')).toBeNull();
    });
  });

  /**
   * 스냅샷은 계산 시점의 설정으로 만들어지고 그 뒤 설정이 바뀌어도 행이 남는다
   * (`toggleSetting`·`updateSetting`은 스냅샷을 지우지 않는다). 그대로 내보내면
   * 사용자가 꺼 둔 출발이 모바일 카드에 뜨고 Live Activity까지 자동으로 시작된다.
   */
  describe('getTodayDeparture', () => {
    it('활성 설정의 스냅샷은 그대로 내려준다', async () => {
      mockToday([snapshotAt(30, { departureType: 'commute' })]);

      const result = await useCase.getTodayDeparture('user-1');
      expect(result.commute).not.toBeUndefined();
    });

    it('꺼진 설정의 스냅샷은 내려주지 않는다', async () => {
      // 저장소가 isEnabled로 거르므로 꺼진 설정은 활성 목록에서 빠진다.
      snapshotRepo.findTodayByUserId.mockResolvedValue([
        snapshotAt(30, { departureType: 'commute' }),
      ]);
      settingRepo.findActiveByUserId.mockResolvedValue([]);

      const result = await useCase.getTodayDeparture('user-1');
      expect(result.commute).toBeUndefined();
    });

    it('오늘이 활성 요일에서 빠진 설정의 스냅샷은 내려주지 않는다', async () => {
      const snapshot = snapshotAt(30, { departureType: 'commute' });
      const everyDayButToday = [0, 1, 2, 3, 4, 5, 6].filter(
        (d) => d !== getDayOfWeekKST(),
      );
      snapshotRepo.findTodayByUserId.mockResolvedValue([snapshot]);
      settingRepo.findActiveByUserId.mockResolvedValue([
        settingFor(snapshot, { activeDays: everyDayButToday }),
      ]);

      const result = await useCase.getTodayDeparture('user-1');
      expect(result.commute).toBeUndefined();
    });

    it('꺼진 출근 설정만 걸러내고 살아 있는 퇴근 설정은 남긴다', async () => {
      const commute = snapshotAt(30, { departureType: 'commute' });
      const returnTrip = snapshotAt(300, { departureType: 'return' });
      snapshotRepo.findTodayByUserId.mockResolvedValue([commute, returnTrip]);
      settingRepo.findActiveByUserId.mockResolvedValue([settingFor(returnTrip)]);

      const result = await useCase.getTodayDeparture('user-1');
      expect(result.commute).toBeUndefined();
      expect(result.return).not.toBeUndefined();
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
