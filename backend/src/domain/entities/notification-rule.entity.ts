import { v4 as uuidv4 } from 'uuid';
import { RuleCondition } from './rule-condition.entity';

export enum RuleCategory {
  WEATHER = 'weather',
  AIR_QUALITY = 'air_quality',
  TRANSIT = 'transit',
  TRANSIT_COMPARISON = 'transit_comparison',
}

export enum RulePriority {
  CRITICAL = 100,  // 안전 경고 (극한 날씨, 매우 나쁜 공기질)
  HIGH = 75,       // 중요 추천 (우산, 마스크)
  MEDIUM = 50,     // 일반 팁
  LOW = 25,        // 참고 정보
}

export class NotificationRule {
  public readonly id: string;
  public readonly name: string;
  public readonly category: RuleCategory;
  public readonly priority: RulePriority;
  public readonly conditions: RuleCondition[];
  public readonly messageTemplate: string;
  public readonly enabled: boolean;
  public readonly isSystemRule: boolean;
  public readonly userId?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(
    name: string,
    category: RuleCategory,
    priority: RulePriority,
    conditions: RuleCondition[],
    messageTemplate: string,
    options?: {
      id?: string;
      enabled?: boolean;
      isSystemRule?: boolean;
      userId?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    this.id = options?.id || uuidv4();
    this.name = name;
    this.category = category;
    this.priority = priority;
    this.conditions = conditions;
    this.messageTemplate = messageTemplate;
    this.enabled = options?.enabled ?? true;
    this.isSystemRule = options?.isSystemRule ?? true;
    this.userId = options?.userId;
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  isApplicable(): boolean {
    return this.enabled;
  }

  static createSystemRule(
    name: string,
    category: RuleCategory,
    priority: RulePriority,
    conditions: RuleCondition[],
    messageTemplate: string
  ): NotificationRule {
    return new NotificationRule(name, category, priority, conditions, messageTemplate, {
      isSystemRule: true,
    });
  }

  static createUserRule(
    userId: string,
    name: string,
    category: RuleCategory,
    priority: RulePriority,
    conditions: RuleCondition[],
    messageTemplate: string
  ): NotificationRule {
    return new NotificationRule(name, category, priority, conditions, messageTemplate, {
      isSystemRule: false,
      userId,
    });
  }
}
