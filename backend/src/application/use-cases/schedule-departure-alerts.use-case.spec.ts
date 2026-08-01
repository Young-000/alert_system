import { ScheduleDepartureAlertsUseCase } from './schedule-departure-alerts.use-case';
import { SmartDepartureSnapshot } from '@domain/entities/smart-departure-snapshot.entity';
import type { SmartDepartureSetting } from '@domain/entities/smart-departure-setting.entity';
import type { ISmartDepartureSnapshotRepository } from '@domain/repositories/smart-departure-snapshot.repository';

/**
 * rescheduleAlerts()는 옛 EventBridge 스케줄을 먼저 지운다. 새 스케줄이
 * 0개로 끝나면(출발 시각이 이미 지난 경우) 스냅샷에 **삭제된** scheduleIds가
 * 그대로 남아, 이후 조회하는 쪽은 존재하지 않는 예약이 살아있다고 읽는다.
 */
describe('ScheduleDepartureAlertsUseCase.rescheduleAlerts', () => {
  const ORIGINAL_ENV = process.env;
  let repo: jest.Mocked<ISmartDepartureSnapshotRepository>;
  let useCase: ScheduleDepartureAlertsUseCase;

  const makeSnapshot = (
    optimalDepartureAt: Date,
    scheduleIds: string[],
  ): SmartDepartureSnapshot =>
    new SmartDepartureSnapshot(
      'user-1',
      'setting-1',
      '2026-08-01',
      'commute',
      '09:00',
      30,
      20,
      optimalDepartureAt,
      { id: 'snapshot-1', scheduleIds },
    );

  const setting = { preAlerts: [30, 10] } as SmartDepartureSetting;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      AWS_ACCOUNT_ID: '123456789012',
      SCHEDULER_ROLE_ARN: 'arn:aws:iam::123456789012:role/scheduler',
    };

    repo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ISmartDepartureSnapshotRepository>;

    useCase = new ScheduleDepartureAlertsUseCase(repo);
    // 실제 AWS 호출은 하지 않는다 — 스냅샷에 무엇이 저장되는지만 본다.
    (useCase as unknown as { client: { send: jest.Mock } }).client = {
      send: jest.fn().mockResolvedValue({}),
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.useRealTimers();
  });

  it('새 스케줄이 0개면 스냅샷의 옛 scheduleIds를 비운다', async () => {
    // 출발 시각이 이미 지나 preAlert가 하나도 생성되지 않는 상황
    const snapshot = makeSnapshot(new Date(Date.now() - 60 * 60 * 1000), [
      'dep-abc-30m',
      'dep-abc-10m',
    ]);

    const result = await useCase.rescheduleAlerts(snapshot, setting);

    expect(result).toEqual([]);
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.update.mock.calls[0][0].scheduleIds).toEqual([]);
  });

  it('새 스케줄이 생기면 그 id들로 교체한다', async () => {
    const snapshot = makeSnapshot(new Date(Date.now() + 2 * 60 * 60 * 1000), [
      'dep-old-30m',
    ]);

    const result = await useCase.rescheduleAlerts(snapshot, setting);

    expect(result).toHaveLength(2);
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.update.mock.calls[0][0].scheduleIds).toEqual(result);
    expect(result).not.toContain('dep-old-30m');
  });

  it('원래 예약이 없고 새로 생기지도 않으면 굳이 저장하지 않는다', async () => {
    const snapshot = makeSnapshot(new Date(Date.now() - 60 * 60 * 1000), []);

    const result = await useCase.scheduleAlerts(snapshot, setting);

    expect(result).toEqual([]);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
