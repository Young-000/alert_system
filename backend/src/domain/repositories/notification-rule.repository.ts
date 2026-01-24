import { NotificationRule, RuleCategory } from '@domain/entities/notification-rule.entity';

export interface INotificationRuleRepository {
  save(rule: NotificationRule): Promise<void>;
  findById(id: string): Promise<NotificationRule | undefined>;
  findAll(): Promise<NotificationRule[]>;
  findByCategories(categories: RuleCategory[]): Promise<NotificationRule[]>;
  findSystemRules(): Promise<NotificationRule[]>;
  findByUserId(userId: string): Promise<NotificationRule[]>;
  findEnabledRules(): Promise<NotificationRule[]>;
  delete(id: string): Promise<void>;
}

export const NOTIFICATION_RULE_REPOSITORY = Symbol('INotificationRuleRepository');
