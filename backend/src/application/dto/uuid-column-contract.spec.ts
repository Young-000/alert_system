import { ValidationPipe } from '@nestjs/common';
import { CreateAlertDto } from './create-alert.dto';
import { UpdateAlertDto } from './update-alert.dto';
import { TrackEventDto, DepartureConfirmedDto } from './behavior.dto';
import { NotificationOpenedDto } from './notification-opened.dto';
import { AlertType } from '@domain/entities/alert.entity';

/**
 * 회귀 방지: uuid 컬럼으로 흘러가는 DTO 필드가 `@IsString()`만 걸고 있으면
 * '강남역' 같은 값이 INSERT까지 내려가 Postgres가
 * `invalid input syntax for type uuid`로 끊는다 — 400이 아니라 **500**이다.
 *
 * 직전 라운드가 `CreateCheckpointDto.linkedStationId`에 대해 같은 결함을 고쳤으나
 * 형제 필드들에는 적용되지 않았다. DDL↔DTO 전수 대조로 남은 5개를 찾았다.
 *
 * | 필드 | 컬럼 |
 * |---|---|
 * | `CreateAlertDto.subwayStationId` | `alerts.subway_station_id UUID` (`schema.sql:37`) |
 * | `UpdateAlertDto.subwayStationId` | 〃 |
 * | `TrackEventDto.alertId` | `behavior_events.alert_id UUID` (`20260120_add_behavior_tracking.sql:11`) |
 * | `DepartureConfirmedDto.alertId` | `behavior_events.alert_id` + `commute_records.alert_id` (`:39`) |
 * | `NotificationOpenedDto.alertId` | `behavior_events.alert_id` |
 *
 * 버전을 고정하지 않은 `@IsUUID()`를 쓴다 — 컬럼이 요구하는 것은 "uuid"이지 "v4"가
 * 아니라서, 버전을 박으면 저장 가능한 값을 되레 막을 수 있다.
 */

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const VALID_UUID = 'b7c9d1e2-3456-4789-abcd-ef0123456789';
const NOT_A_UUID = '강남역';

describe('uuid 컬럼 계약 - CreateAlertDto.subwayStationId', () => {
  const metadata = { type: 'body' as const, metatype: CreateAlertDto };
  const base = {
    userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f',
    name: '출근 알림',
    schedule: '0 8 * * 1-5',
    alertTypes: [AlertType.SUBWAY],
  };

  it('uuid가 아닌 subwayStationId는 400으로 거절한다', async () => {
    await expect(
      pipe.transform({ ...base, subwayStationId: NOT_A_UUID }, metadata),
    ).rejects.toThrow();
  });

  it('uuid 형식의 subwayStationId는 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { ...base, subwayStationId: VALID_UUID },
      metadata,
    )) as CreateAlertDto;
    expect(result.subwayStationId).toBe(VALID_UUID);
  });

  it('subwayStationId 생략은 여전히 통과한다 (대조군 - optional 보존)', async () => {
    const result = (await pipe.transform({ ...base }, metadata)) as CreateAlertDto;
    expect(result.subwayStationId).toBeUndefined();
  });
});

describe('uuid 컬럼 계약 - UpdateAlertDto.subwayStationId', () => {
  const metadata = { type: 'body' as const, metatype: UpdateAlertDto };

  it('uuid가 아닌 subwayStationId는 400으로 거절한다', async () => {
    await expect(pipe.transform({ subwayStationId: NOT_A_UUID }, metadata)).rejects.toThrow();
  });

  it('uuid 형식의 subwayStationId는 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { subwayStationId: VALID_UUID },
      metadata,
    )) as UpdateAlertDto;
    expect(result.subwayStationId).toBe(VALID_UUID);
  });
});

describe('uuid 컬럼 계약 - TrackEventDto.alertId', () => {
  const metadata = { type: 'body' as const, metatype: TrackEventDto };
  const base = { userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f', eventType: 'notification_opened' };

  it('uuid가 아닌 alertId는 400으로 거절한다', async () => {
    await expect(pipe.transform({ ...base, alertId: NOT_A_UUID }, metadata)).rejects.toThrow();
  });

  it('uuid 형식의 alertId는 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { ...base, alertId: VALID_UUID },
      metadata,
    )) as TrackEventDto;
    expect(result.alertId).toBe(VALID_UUID);
  });

  it('alertId 생략은 여전히 통과한다 (대조군 - optional 보존)', async () => {
    const result = (await pipe.transform({ ...base }, metadata)) as TrackEventDto;
    expect(result.alertId).toBeUndefined();
  });
});

describe('uuid 컬럼 계약 - DepartureConfirmedDto.alertId', () => {
  const metadata = { type: 'body' as const, metatype: DepartureConfirmedDto };
  const base = {
    userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f',
    source: 'push' as const,
  };

  it('uuid가 아닌 alertId는 400으로 거절한다', async () => {
    await expect(pipe.transform({ ...base, alertId: NOT_A_UUID }, metadata)).rejects.toThrow();
  });

  it('uuid 형식의 alertId는 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { ...base, alertId: VALID_UUID },
      metadata,
    )) as DepartureConfirmedDto;
    expect(result.alertId).toBe(VALID_UUID);
  });
});

describe('uuid 컬럼 계약 - NotificationOpenedDto.alertId', () => {
  const metadata = { type: 'body' as const, metatype: NotificationOpenedDto };
  const base = { userId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f' };

  it('uuid가 아닌 alertId는 400으로 거절한다', async () => {
    await expect(pipe.transform({ ...base, alertId: NOT_A_UUID }, metadata)).rejects.toThrow();
  });

  it('uuid 형식의 alertId는 통과한다 (대조군)', async () => {
    const result = (await pipe.transform(
      { ...base, alertId: VALID_UUID },
      metadata,
    )) as NotificationOpenedDto;
    expect(result.alertId).toBe(VALID_UUID);
  });

  it('notificationId는 uuid가 아니어도 통과한다 (대조군 - metadata JSON 경유)', async () => {
    const result = (await pipe.transform(
      { ...base, alertId: VALID_UUID, notificationId: 'fcm-token-abc' },
      metadata,
    )) as NotificationOpenedDto;
    expect(result.notificationId).toBe('fcm-token-abc');
  });
});
