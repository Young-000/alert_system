import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationRuleEntity } from '@infrastructure/persistence/typeorm/notification-rule.entity';
import { PostgresNotificationRuleRepository } from '@infrastructure/persistence/repositories/notification-rule.repository';
import { NOTIFICATION_RULE_REPOSITORY } from '@domain/repositories/notification-rule.repository';
import { RuleEngine, RULE_ENGINE } from '@domain/services/rule-engine.service';
import { SmartMessageBuilder, SMART_MESSAGE_BUILDER } from '@application/services/smart-message-builder.service';
import { WeatherConditionEvaluator } from '@domain/services/evaluators/weather-evaluator';
import { AirQualityConditionEvaluator } from '@domain/services/evaluators/air-quality-evaluator';
import { TransitConditionEvaluator } from '@domain/services/evaluators/transit-evaluator';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationRuleEntity]),
  ],
  providers: [
    // Evaluators
    WeatherConditionEvaluator,
    AirQualityConditionEvaluator,
    TransitConditionEvaluator,

    // Rule Engine
    {
      provide: RULE_ENGINE,
      useClass: RuleEngine,
    },
    RuleEngine,

    // Smart Message Builder
    {
      provide: SMART_MESSAGE_BUILDER,
      useClass: SmartMessageBuilder,
    },
    SmartMessageBuilder,

    // Repository
    {
      provide: NOTIFICATION_RULE_REPOSITORY,
      useClass: PostgresNotificationRuleRepository,
    },
    PostgresNotificationRuleRepository,
  ],
  exports: [
    RULE_ENGINE,
    SMART_MESSAGE_BUILDER,
    NOTIFICATION_RULE_REPOSITORY,
    RuleEngine,
    SmartMessageBuilder,
    PostgresNotificationRuleRepository,
    WeatherConditionEvaluator,
    AirQualityConditionEvaluator,
    TransitConditionEvaluator,
  ],
})
export class SmartNotificationModule {}
