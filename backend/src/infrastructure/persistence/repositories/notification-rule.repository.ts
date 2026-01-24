import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotificationRuleEntity } from '../typeorm/notification-rule.entity';
import { INotificationRuleRepository } from '@domain/repositories/notification-rule.repository';
import { NotificationRule, RuleCategory, RulePriority } from '@domain/entities/notification-rule.entity';
import { RuleCondition } from '@domain/entities/rule-condition.entity';

@Injectable()
export class PostgresNotificationRuleRepository implements INotificationRuleRepository {
  constructor(
    @InjectRepository(NotificationRuleEntity)
    private readonly repository: Repository<NotificationRuleEntity>,
  ) {}

  async save(rule: NotificationRule): Promise<void> {
    const entity = this.toEntity(rule);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<NotificationRule | undefined> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : undefined;
  }

  async findAll(): Promise<NotificationRule[]> {
    const entities = await this.repository.find({
      order: { priority: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByCategories(categories: RuleCategory[]): Promise<NotificationRule[]> {
    const entities = await this.repository.find({
      where: {
        category: In(categories),
        enabled: true,
      },
      order: { priority: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findSystemRules(): Promise<NotificationRule[]> {
    const entities = await this.repository.find({
      where: { isSystemRule: true },
      order: { priority: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByUserId(userId: string): Promise<NotificationRule[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { priority: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findEnabledRules(): Promise<NotificationRule[]> {
    const entities = await this.repository.find({
      where: { enabled: true },
      order: { priority: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toEntity(rule: NotificationRule): NotificationRuleEntity {
    const entity = new NotificationRuleEntity();
    entity.id = rule.id;
    entity.name = rule.name;
    entity.category = rule.category;
    entity.priority = rule.priority;
    entity.conditions = rule.conditions as object[];
    entity.messageTemplate = rule.messageTemplate;
    entity.enabled = rule.enabled;
    entity.isSystemRule = rule.isSystemRule;
    entity.userId = rule.userId;
    return entity;
  }

  private toDomain(entity: NotificationRuleEntity): NotificationRule {
    return new NotificationRule(
      entity.name,
      entity.category as RuleCategory,
      entity.priority as RulePriority,
      entity.conditions as RuleCondition[],
      entity.messageTemplate,
      {
        id: entity.id,
        enabled: entity.enabled,
        isSystemRule: entity.isSystemRule,
        userId: entity.userId,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      }
    );
  }
}
