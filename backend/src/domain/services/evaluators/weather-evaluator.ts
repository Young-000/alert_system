import { Injectable } from '@nestjs/common';
import { NotificationContext } from '@domain/entities/notification-context.entity';
import { RuleCondition, DataSource } from '@domain/entities/rule-condition.entity';
import { BaseConditionEvaluator } from './condition-evaluator.interface';

@Injectable()
export class WeatherConditionEvaluator extends BaseConditionEvaluator {
  canEvaluate(dataSource: DataSource): boolean {
    return dataSource === DataSource.WEATHER;
  }

  evaluate(context: NotificationContext, condition: RuleCondition): boolean {
    if (!context.weather) {
      return false;
    }

    const weather = context.weather;
    let value: unknown;

    switch (condition.field) {
      case 'temperature':
        value = weather.temperature;
        break;
      case 'condition':
        value = weather.condition;
        break;
      case 'humidity':
        value = weather.humidity;
        break;
      case 'windSpeed':
        value = weather.windSpeed;
        break;
      case 'location':
        value = weather.location;
        break;
      default:
        return false;
    }

    return this.compareValues(value, condition.operator, condition.value);
  }
}
