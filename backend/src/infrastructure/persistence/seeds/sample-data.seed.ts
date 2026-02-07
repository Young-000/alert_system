import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';

/**
 * Phase 2 테스트용 샘플 데이터 시드
 *
 * 사용법:
 * 1. npm run seed:sample (package.json에 스크립트 추가 필요)
 * 2. 또는 API 엔드포인트로 호출
 */

// 샘플 사용자 데이터
export const SAMPLE_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: '테스트유저',
  phoneNumber: '01012345678',
  email: 'test@example.com',
  location: { lat: 37.5665, lng: 126.9780 }, // 서울시청
};

// 샘플 경로 데이터
export const SAMPLE_ROUTES = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    userId: SAMPLE_USER.id,
    name: '출근 경로 A (2호선)',
    routeType: 'morning',
    isPreferred: true,
    totalExpectedDuration: 45,
    checkpoints: [
      { sequenceOrder: 1, name: '집', checkpointType: 'home', transportMode: 'walk', expectedDurationToNext: 10, expectedWaitTime: 0 },
      { sequenceOrder: 2, name: '강남역', checkpointType: 'subway', transportMode: 'subway', expectedDurationToNext: 25, expectedWaitTime: 5 },
      { sequenceOrder: 3, name: '회사', checkpointType: 'work', transportMode: 'walk', expectedDurationToNext: 0, expectedWaitTime: 0 },
    ],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    userId: SAMPLE_USER.id,
    name: '출근 경로 B (버스)',
    routeType: 'morning',
    isPreferred: false,
    totalExpectedDuration: 55,
    checkpoints: [
      { sequenceOrder: 1, name: '집', checkpointType: 'home', transportMode: 'walk', expectedDurationToNext: 5, expectedWaitTime: 0 },
      { sequenceOrder: 2, name: '버스정류장', checkpointType: 'bus_stop', transportMode: 'bus', expectedDurationToNext: 40, expectedWaitTime: 10 },
      { sequenceOrder: 3, name: '회사', checkpointType: 'work', transportMode: 'walk', expectedDurationToNext: 0, expectedWaitTime: 0 },
    ],
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    userId: SAMPLE_USER.id,
    name: '퇴근 경로',
    routeType: 'evening',
    isPreferred: true,
    totalExpectedDuration: 40,
    checkpoints: [
      { sequenceOrder: 1, name: '회사', checkpointType: 'work', transportMode: 'walk', expectedDurationToNext: 5, expectedWaitTime: 0 },
      { sequenceOrder: 2, name: '강남역', checkpointType: 'subway', transportMode: 'subway', expectedDurationToNext: 25, expectedWaitTime: 5 },
      { sequenceOrder: 3, name: '집', checkpointType: 'home', transportMode: 'walk', expectedDurationToNext: 0, expectedWaitTime: 0 },
    ],
  },
];

// 샘플 통근 세션 (경로 추천 테스트용)
export const SAMPLE_SESSIONS = [
  // 경로 A - 평균 43분, 안정적
  { routeId: SAMPLE_ROUTES[0].id, totalDurationMinutes: 42, weatherCondition: '맑음' },
  { routeId: SAMPLE_ROUTES[0].id, totalDurationMinutes: 44, weatherCondition: '맑음' },
  { routeId: SAMPLE_ROUTES[0].id, totalDurationMinutes: 43, weatherCondition: '흐림' },
  { routeId: SAMPLE_ROUTES[0].id, totalDurationMinutes: 45, weatherCondition: '비' },
  { routeId: SAMPLE_ROUTES[0].id, totalDurationMinutes: 44, weatherCondition: '맑음' },
  { routeId: SAMPLE_ROUTES[0].id, totalDurationMinutes: 41, weatherCondition: '맑음' },
  // 경로 B - 평균 52분, 변동 큼
  { routeId: SAMPLE_ROUTES[1].id, totalDurationMinutes: 48, weatherCondition: '맑음' },
  { routeId: SAMPLE_ROUTES[1].id, totalDurationMinutes: 55, weatherCondition: '맑음' },
  { routeId: SAMPLE_ROUTES[1].id, totalDurationMinutes: 60, weatherCondition: '비' },
  { routeId: SAMPLE_ROUTES[1].id, totalDurationMinutes: 50, weatherCondition: '흐림' },
];

// 샘플 알림 (경로 연결됨)
export const SAMPLE_ALERTS = [
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    userId: SAMPLE_USER.id,
    name: '아침 출근 알림',
    schedule: '0 7 * * *', // 매일 오전 7시
    alertTypes: ['weather', 'airQuality', 'subway'],
    enabled: true,
    routeId: SAMPLE_ROUTES[0].id, // 출근 경로 A 연결
    subwayStationId: '944432d7-6ab0-49c1-88aa-c5663c55409c', // 강남역 (2호선)
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    userId: SAMPLE_USER.id,
    name: '퇴근 알림',
    schedule: '0 18 * * *', // 매일 오후 6시
    alertTypes: ['weather', 'subway'],
    enabled: true,
    routeId: SAMPLE_ROUTES[2].id, // 퇴근 경로 연결
  },
];

/**
 * 샘플 데이터 삽입 함수
 */
const logger = new Logger('SampleDataSeed');

export async function seedSampleData(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. 기존 샘플 데이터 정리 (선택적)
    await queryRunner.query(`
      DELETE FROM alert_system.checkpoint_records WHERE session_id IN (
        SELECT id FROM alert_system.commute_sessions WHERE user_id = $1
      )
    `, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.commute_sessions WHERE user_id = $1`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.alerts WHERE user_id = $1`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.route_checkpoints WHERE route_id IN (
      SELECT id FROM alert_system.commute_routes WHERE user_id = $1
    )`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.commute_routes WHERE user_id = $1`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.users WHERE id = $1`, [SAMPLE_USER.id]);

    // 2. 사용자 삽입
    await queryRunner.query(`
      INSERT INTO alert_system.users (id, name, phone_number, email, location)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET name = $2, phone_number = $3
    `, [SAMPLE_USER.id, SAMPLE_USER.name, SAMPLE_USER.phoneNumber, SAMPLE_USER.email, JSON.stringify(SAMPLE_USER.location)]);

    // 3. 경로 삽입
    for (const route of SAMPLE_ROUTES) {
      await queryRunner.query(`
        INSERT INTO alert_system.commute_routes (id, user_id, name, route_type, is_preferred, total_expected_duration)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [route.id, route.userId, route.name, route.routeType, route.isPreferred, route.totalExpectedDuration]);

      // 체크포인트 삽입
      for (const cp of route.checkpoints) {
        await queryRunner.query(`
          INSERT INTO alert_system.route_checkpoints (id, route_id, sequence_order, name, checkpoint_type, transport_mode, expected_duration_to_next, expected_wait_time)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [uuidv4(), route.id, cp.sequenceOrder, cp.name, cp.checkpointType, cp.transportMode, cp.expectedDurationToNext, cp.expectedWaitTime]);
      }
    }

    // 4. 통근 세션 삽입 (추천 알고리즘 테스트용)
    for (const session of SAMPLE_SESSIONS) {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 30)); // 최근 30일 내
      const endTime = new Date(startTime.getTime() + session.totalDurationMinutes * 60 * 1000);

      await queryRunner.query(`
        INSERT INTO alert_system.commute_sessions (id, user_id, route_id, status, started_at, completed_at, total_duration_minutes, weather_condition)
        VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7)
      `, [uuidv4(), SAMPLE_USER.id, session.routeId, startTime, endTime, session.totalDurationMinutes, session.weatherCondition]);
    }

    // 5. 알림 삽입 (경로 연결됨)
    for (const alert of SAMPLE_ALERTS) {
      await queryRunner.query(`
        INSERT INTO alert_system.alerts (id, user_id, name, schedule, alert_types, enabled, route_id, subway_station_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [alert.id, alert.userId, alert.name, alert.schedule, JSON.stringify(alert.alertTypes), alert.enabled, alert.routeId, alert.subwayStationId || null]);
    }

    await queryRunner.commitTransaction();
    logger.log('Sample data seeded successfully!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('Failed to seed sample data:', error instanceof Error ? error.stack : String(error));
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * 샘플 데이터 삭제 함수
 */
export async function clearSampleData(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.query(`DELETE FROM alert_system.alerts WHERE user_id = $1`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.route_checkpoints WHERE route_id IN (
      SELECT id FROM alert_system.commute_routes WHERE user_id = $1
    )`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.commute_routes WHERE user_id = $1`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.checkpoint_records WHERE session_id IN (
      SELECT id FROM alert_system.commute_sessions WHERE user_id = $1
    )`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.commute_sessions WHERE user_id = $1`, [SAMPLE_USER.id]);
    await queryRunner.query(`DELETE FROM alert_system.users WHERE id = $1`, [SAMPLE_USER.id]);

    logger.log('Sample data cleared successfully!');
  } finally {
    await queryRunner.release();
  }
}
