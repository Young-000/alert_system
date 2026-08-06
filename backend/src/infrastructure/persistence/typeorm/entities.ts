import { UserEntity } from './user.entity';
import { AlertEntity } from './alert.entity';
import { SubwayStationEntity } from './subway-station.entity';
import { WeatherCacheEntity } from './weather-cache.entity';
import { AirQualityCacheEntity } from './air-quality-cache.entity';
import {
  SubwayArrivalCacheEntity,
  BusArrivalCacheEntity,
  ApiCallLogEntity,
} from './transport-cache.entity';
import { NotificationRuleEntity } from './notification-rule.entity';
import { BehaviorEventEntity } from './behavior-event.entity';
import { UserPatternEntity } from './user-pattern.entity';
import { CommuteRecordEntity } from './commute-record.entity';
// Commute tracking entities
import { CommuteRouteEntity } from './commute-route.entity';
import { RouteCheckpointEntity } from './route-checkpoint.entity';
import { CommuteSessionEntity } from './commute-session.entity';
import { CheckpointRecordEntity } from './checkpoint-record.entity';
import { RouteAnalyticsEntity } from './route-analytics.entity';
import { NotificationLogEntity } from './notification-log.entity';
import { PushSubscriptionEntity } from './push-subscription.entity';
// Geofence entities
import { UserPlaceEntity } from './user-place.entity';
import { CommuteEventEntity } from './commute-event.entity';
// Smart departure entities
import { SmartDepartureSettingEntity } from './smart-departure-setting.entity';
import { SmartDepartureSnapshotEntity } from './smart-departure-snapshot.entity';
// Challenge system entities
import { ChallengeTemplateEntity } from './challenge-template.entity';
import { UserChallengeEntity } from './user-challenge.entity';
import { UserBadgeEntity } from './user-badge.entity';
// Mission system entities
import { MissionEntity } from './mission.entity';
import { DailyMissionRecordEntity } from './daily-mission-record.entity';
import { MissionScoreEntity } from './mission-score.entity';
// Streak entities
import { CommuteStreakOrmEntity } from './commute-streak.orm-entity';
import { StreakDailyLogOrmEntity } from './streak-daily-log.orm-entity';
// Live Activity entities
import { LiveActivityTokenEntity } from './live-activity-token.entity';
// Alternative route entities
import { AlternativeMappingEntity } from './alternative-mapping.entity';
// Congestion entities
import { SegmentCongestionEntity } from './segment-congestion.entity';
// Community entities
import { CommunityTipEntity } from './community-tip.entity';
import { CommunityTipReportEntity } from './community-tip-report.entity';
import { CommunityTipHelpfulEntity } from './community-tip-helpful.entity';
// Regional insights
import { RegionalInsightEntity } from './regional-insight.entity';

/**
 * TypeORM 엔티티 단일 목록 (SSOT).
 *
 * 프로덕션(postgres)·로컬 SQLite·E2E(sqljs) DataSource가 모두 이 목록을 쓴다.
 * 목록을 복제하면 어느 한쪽만 갱신돼 런타임에야 드러나는 드리프트가 생긴다 —
 * 실제로 E2E 테스트 DB가 9개만 등록한 채 방치돼
 * `No metadata for "ChallengeTemplateEntity" was found` 로 시드가 실패했다.
 * 새 엔티티는 반드시 여기에만 추가한다.
 */
export const ALL_ENTITIES = [
  UserEntity,
  AlertEntity,
  SubwayStationEntity,
  WeatherCacheEntity,
  AirQualityCacheEntity,
  SubwayArrivalCacheEntity,
  BusArrivalCacheEntity,
  ApiCallLogEntity,
  NotificationRuleEntity,
  BehaviorEventEntity,
  UserPatternEntity,
  CommuteRecordEntity,
  CommuteRouteEntity,
  RouteCheckpointEntity,
  CommuteSessionEntity,
  CheckpointRecordEntity,
  RouteAnalyticsEntity,
  NotificationLogEntity,
  PushSubscriptionEntity,
  // Geofence
  UserPlaceEntity,
  CommuteEventEntity,
  // Smart departure
  SmartDepartureSettingEntity,
  SmartDepartureSnapshotEntity,
  // Challenge system
  ChallengeTemplateEntity,
  UserChallengeEntity,
  UserBadgeEntity,
  // Mission system
  MissionEntity,
  DailyMissionRecordEntity,
  MissionScoreEntity,
  // Streak
  CommuteStreakOrmEntity,
  StreakDailyLogOrmEntity,
  // Live Activity
  LiveActivityTokenEntity,
  // Alternative route
  AlternativeMappingEntity,
  // Congestion
  SegmentCongestionEntity,
  // Community
  CommunityTipEntity,
  CommunityTipReportEntity,
  CommunityTipHelpfulEntity,
  // Regional insights
  RegionalInsightEntity,
];
