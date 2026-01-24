import { Injectable } from '@nestjs/common';
import { NotificationContext } from '@domain/entities/notification-context.entity';
import { RuleCondition, DataSource } from '@domain/entities/rule-condition.entity';
import { BaseConditionEvaluator } from './condition-evaluator.interface';

@Injectable()
export class TransitConditionEvaluator extends BaseConditionEvaluator {
  canEvaluate(dataSource: DataSource): boolean {
    return dataSource === DataSource.BUS_ARRIVAL || dataSource === DataSource.SUBWAY_ARRIVAL;
  }

  evaluate(context: NotificationContext, condition: RuleCondition): boolean {
    if (condition.dataSource === DataSource.BUS_ARRIVAL) {
      return this.evaluateBusArrival(context, condition);
    } else if (condition.dataSource === DataSource.SUBWAY_ARRIVAL) {
      return this.evaluateSubwayArrival(context, condition);
    }
    return false;
  }

  private evaluateBusArrival(context: NotificationContext, condition: RuleCondition): boolean {
    if (!context.busArrivals || context.busArrivals.length === 0) {
      return false;
    }

    // Use the first (nearest) arrival for evaluation
    const firstArrival = context.busArrivals[0];
    let value: unknown;

    switch (condition.field) {
      case 'arrivalTime':
        value = firstArrival.arrivalTime;
        break;
      case 'routeName':
        value = firstArrival.routeName;
        break;
      case 'remainingStops':
        value = firstArrival.remainingStops;
        break;
      default:
        return false;
    }

    return this.compareValues(value, condition.operator, condition.value);
  }

  private evaluateSubwayArrival(context: NotificationContext, condition: RuleCondition): boolean {
    if (!context.subwayArrivals || context.subwayArrivals.length === 0) {
      return false;
    }

    // Use the first (nearest) arrival for evaluation
    const firstArrival = context.subwayArrivals[0];
    let value: unknown;

    switch (condition.field) {
      case 'arrivalTime':
        value = firstArrival.arrivalTime;
        break;
      case 'direction':
        value = firstArrival.direction;
        break;
      case 'destination':
        value = firstArrival.destination;
        break;
      case 'lineId':
        value = firstArrival.lineId;
        break;
      default:
        return false;
    }

    return this.compareValues(value, condition.operator, condition.value);
  }
}
