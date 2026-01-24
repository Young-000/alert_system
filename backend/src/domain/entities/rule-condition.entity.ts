export enum DataSource {
  WEATHER = 'weather',
  AIR_QUALITY = 'airQuality',
  BUS_ARRIVAL = 'busArrival',
  SUBWAY_ARRIVAL = 'subwayArrival',
}

export enum ComparisonOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  CONTAINS = 'contains',
  IN = 'in',
  BETWEEN = 'between',
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
}

export interface RuleCondition {
  dataSource: DataSource;
  field: string;
  operator: ComparisonOperator;
  value: ConditionValue;
  logicalOperator?: LogicalOperator;
}

export type ConditionValue = string | number | boolean | (string | number)[];

export class RuleConditionBuilder {
  private dataSource: DataSource;
  private field: string;
  private operator: ComparisonOperator;
  private value: ConditionValue;
  private logicalOperator?: LogicalOperator;

  static weather(field: string): RuleConditionBuilder {
    const builder = new RuleConditionBuilder();
    builder.dataSource = DataSource.WEATHER;
    builder.field = field;
    return builder;
  }

  static airQuality(field: string): RuleConditionBuilder {
    const builder = new RuleConditionBuilder();
    builder.dataSource = DataSource.AIR_QUALITY;
    builder.field = field;
    return builder;
  }

  static busArrival(field: string): RuleConditionBuilder {
    const builder = new RuleConditionBuilder();
    builder.dataSource = DataSource.BUS_ARRIVAL;
    builder.field = field;
    return builder;
  }

  static subwayArrival(field: string): RuleConditionBuilder {
    const builder = new RuleConditionBuilder();
    builder.dataSource = DataSource.SUBWAY_ARRIVAL;
    builder.field = field;
    return builder;
  }

  equals(value: ConditionValue): RuleConditionBuilder {
    this.operator = ComparisonOperator.EQUALS;
    this.value = value;
    return this;
  }

  greaterThan(value: number): RuleConditionBuilder {
    this.operator = ComparisonOperator.GREATER_THAN;
    this.value = value;
    return this;
  }

  lessThan(value: number): RuleConditionBuilder {
    this.operator = ComparisonOperator.LESS_THAN;
    this.value = value;
    return this;
  }

  greaterThanOrEqual(value: number): RuleConditionBuilder {
    this.operator = ComparisonOperator.GREATER_THAN_OR_EQUAL;
    this.value = value;
    return this;
  }

  lessThanOrEqual(value: number): RuleConditionBuilder {
    this.operator = ComparisonOperator.LESS_THAN_OR_EQUAL;
    this.value = value;
    return this;
  }

  contains(value: string): RuleConditionBuilder {
    this.operator = ComparisonOperator.CONTAINS;
    this.value = value;
    return this;
  }

  in(values: (string | number)[]): RuleConditionBuilder {
    this.operator = ComparisonOperator.IN;
    this.value = values;
    return this;
  }

  between(min: number, max: number): RuleConditionBuilder {
    this.operator = ComparisonOperator.BETWEEN;
    this.value = [min, max];
    return this;
  }

  and(): RuleConditionBuilder {
    this.logicalOperator = LogicalOperator.AND;
    return this;
  }

  or(): RuleConditionBuilder {
    this.logicalOperator = LogicalOperator.OR;
    return this;
  }

  build(): RuleCondition {
    return {
      dataSource: this.dataSource,
      field: this.field,
      operator: this.operator,
      value: this.value,
      logicalOperator: this.logicalOperator,
    };
  }
}
