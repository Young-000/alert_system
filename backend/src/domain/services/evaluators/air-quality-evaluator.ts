import { Injectable } from '@nestjs/common';
import { NotificationContext } from '@domain/entities/notification-context.entity';
import { RuleCondition, DataSource } from '@domain/entities/rule-condition.entity';
import { BaseConditionEvaluator } from './condition-evaluator.interface';

@Injectable()
export class AirQualityConditionEvaluator extends BaseConditionEvaluator {
  canEvaluate(dataSource: DataSource): boolean {
    return dataSource === DataSource.AIR_QUALITY;
  }

  evaluate(context: NotificationContext, condition: RuleCondition): boolean {
    if (!context.airQuality) {
      return false;
    }

    const airQuality = context.airQuality;
    let value: unknown;

    switch (condition.field) {
      case 'pm10':
        value = airQuality.pm10;
        break;
      case 'pm25':
        value = airQuality.pm25;
        break;
      case 'aqi':
        value = airQuality.aqi;
        break;
      case 'status':
        value = airQuality.status;
        break;
      case 'location':
        value = airQuality.location;
        break;
      default:
        return false;
    }

    return this.compareValues(value, condition.operator, condition.value);
  }
}
