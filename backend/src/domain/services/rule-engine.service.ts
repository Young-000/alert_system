import { Injectable } from '@nestjs/common';
import { NotificationContext } from '@domain/entities/notification-context.entity';
import { NotificationRule } from '@domain/entities/notification-rule.entity';
import { RuleCondition, LogicalOperator } from '@domain/entities/rule-condition.entity';
import { Recommendation, getIconForCategory } from '@domain/entities/recommendation.entity';
import { IConditionEvaluator } from './evaluators/condition-evaluator.interface';
import { WeatherConditionEvaluator } from './evaluators/weather-evaluator';
import { AirQualityConditionEvaluator } from './evaluators/air-quality-evaluator';
import { TransitConditionEvaluator } from './evaluators/transit-evaluator';

export interface IRuleEngine {
  evaluate(context: NotificationContext, rules: NotificationRule[]): Recommendation[];
}

export const RULE_ENGINE = Symbol('IRuleEngine');

@Injectable()
export class RuleEngine implements IRuleEngine {
  private evaluators: IConditionEvaluator[];

  constructor(
    private weatherEvaluator: WeatherConditionEvaluator,
    private airQualityEvaluator: AirQualityConditionEvaluator,
    private transitEvaluator: TransitConditionEvaluator,
  ) {
    this.evaluators = [
      this.weatherEvaluator,
      this.airQualityEvaluator,
      this.transitEvaluator,
    ];
  }

  evaluate(context: NotificationContext, rules: NotificationRule[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const rule of rules.filter(r => r.enabled)) {
      if (this.evaluateConditions(context, rule.conditions)) {
        const message = this.buildMessage(rule.messageTemplate, context);
        recommendations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          priority: rule.priority,
          message,
          icon: getIconForCategory(rule.category),
          metadata: this.extractMetadata(context, rule),
        });
      }
    }

    // Sort by priority (highest first)
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private evaluateConditions(context: NotificationContext, conditions: RuleCondition[]): boolean {
    if (conditions.length === 0) {
      return false;
    }

    let result = this.evaluateSingleCondition(context, conditions[0]);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const previousCondition = conditions[i - 1];
      const logicalOp = previousCondition.logicalOperator || LogicalOperator.AND;
      const conditionResult = this.evaluateSingleCondition(context, condition);

      if (logicalOp === LogicalOperator.AND) {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    return result;
  }

  private evaluateSingleCondition(context: NotificationContext, condition: RuleCondition): boolean {
    const evaluator = this.evaluators.find(e => e.canEvaluate(condition.dataSource));
    if (!evaluator) {
      return false;
    }
    return evaluator.evaluate(context, condition);
  }

  private buildMessage(template: string, context: NotificationContext): string {
    let message = template;

    // Weather variables
    if (context.weather) {
      message = message.replace(/\{\{weather\.temperature\}\}/g, String(context.weather.temperature));
      message = message.replace(/\{\{weather\.condition\}\}/g, context.weather.condition);
      message = message.replace(/\{\{weather\.humidity\}\}/g, String(context.weather.humidity));
      message = message.replace(/\{\{weather\.windSpeed\}\}/g, String(context.weather.windSpeed));
      message = message.replace(/\{\{weather\.location\}\}/g, context.weather.location);
    }

    // Air quality variables
    if (context.airQuality) {
      message = message.replace(/\{\{airQuality\.pm10\}\}/g, String(context.airQuality.pm10));
      message = message.replace(/\{\{airQuality\.pm25\}\}/g, String(context.airQuality.pm25));
      message = message.replace(/\{\{airQuality\.aqi\}\}/g, String(context.airQuality.aqi));
      message = message.replace(/\{\{airQuality\.status\}\}/g, context.airQuality.status);
    }

    // Transit variables
    if (context.busArrivals && context.busArrivals.length > 0) {
      const firstBus = context.busArrivals[0];
      message = message.replace(/\{\{busArrival\.arrivalTime\}\}/g, String(firstBus.arrivalTime));
      message = message.replace(/\{\{busArrival\.routeName\}\}/g, firstBus.routeName);
    }

    if (context.subwayArrivals && context.subwayArrivals.length > 0) {
      const firstSubway = context.subwayArrivals[0];
      message = message.replace(/\{\{subwayArrival\.arrivalTime\}\}/g, String(firstSubway.arrivalTime));
      message = message.replace(/\{\{subwayArrival\.destination\}\}/g, firstSubway.destination);
    }

    // Transit comparison
    message = message.replace(/\{\{transit\.comparison\}\}/g, this.buildTransitComparison(context));

    // Station/Stop names
    if (context.subwayStationName) {
      message = message.replace(/\{\{subwayStationName\}\}/g, context.subwayStationName);
    }
    if (context.busStopName) {
      message = message.replace(/\{\{busStopName\}\}/g, context.busStopName);
    }

    return message;
  }

  private buildTransitComparison(context: NotificationContext): string {
    const { busArrivals, subwayArrivals } = context;

    if (!busArrivals?.length || !subwayArrivals?.length) {
      return '';
    }

    const fastestBus = busArrivals[0].arrivalTime;
    const fastestSubway = subwayArrivals[0].arrivalTime;
    const diff = Math.abs(fastestBus - fastestSubway);

    if (diff <= 2) {
      return '버스와 지하철 도착 시간이 비슷해요';
    }

    if (fastestBus < fastestSubway) {
      return `버스가 지하철보다 ${diff}분 빨라요!`;
    } else {
      return `지하철이 버스보다 ${diff}분 빨라요!`;
    }
  }

  private extractMetadata(context: NotificationContext, rule: NotificationRule): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      ruleCategory: rule.category,
      evaluatedAt: context.timestamp.toISOString(),
    };

    if (context.weather) {
      metadata.weatherData = {
        temperature: context.weather.temperature,
        condition: context.weather.condition,
      };
    }

    if (context.airQuality) {
      metadata.airQualityData = {
        pm10: context.airQuality.pm10,
        pm25: context.airQuality.pm25,
        status: context.airQuality.status,
      };
    }

    return metadata;
  }
}
