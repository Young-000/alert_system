import { NotificationContext } from '@domain/entities/notification-context.entity';
import { RuleCondition, DataSource } from '@domain/entities/rule-condition.entity';

export interface IConditionEvaluator {
  canEvaluate(dataSource: DataSource): boolean;
  evaluate(context: NotificationContext, condition: RuleCondition): boolean;
}

export abstract class BaseConditionEvaluator implements IConditionEvaluator {
  abstract canEvaluate(dataSource: DataSource): boolean;
  abstract evaluate(context: NotificationContext, condition: RuleCondition): boolean;

  protected compareValues(
    actual: unknown,
    operator: string,
    expected: unknown
  ): boolean {
    if (actual === undefined || actual === null) {
      return false;
    }

    switch (operator) {
      case 'eq':
        return actual === expected;

      case 'neq':
        return actual !== expected;

      case 'gt':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;

      case 'gte':
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;

      case 'lt':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;

      case 'lte':
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;

      case 'contains':
        return typeof actual === 'string' &&
               typeof expected === 'string' &&
               actual.toLowerCase().includes(expected.toLowerCase());

      case 'in':
        return Array.isArray(expected) && expected.includes(actual);

      case 'between':
        if (typeof actual === 'number' && Array.isArray(expected) && expected.length === 2) {
          const [min, max] = expected as [number, number];
          return actual >= min && actual <= max;
        }
        return false;

      default:
        return false;
    }
  }

  protected getFieldValue(obj: Record<string, unknown>, field: string): unknown {
    const keys = field.split('.');
    let value: unknown = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return value;
  }
}
