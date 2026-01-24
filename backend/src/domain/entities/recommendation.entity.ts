import { RuleCategory, RulePriority } from './notification-rule.entity';

export interface Recommendation {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  priority: RulePriority;
  message: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export class RecommendationBuilder {
  private recommendation: Partial<Recommendation> = {};

  static create(): RecommendationBuilder {
    return new RecommendationBuilder();
  }

  fromRule(ruleId: string, ruleName: string, category: RuleCategory, priority: RulePriority): RecommendationBuilder {
    this.recommendation.ruleId = ruleId;
    this.recommendation.ruleName = ruleName;
    this.recommendation.category = category;
    this.recommendation.priority = priority;
    return this;
  }

  withMessage(message: string): RecommendationBuilder {
    this.recommendation.message = message;
    return this;
  }

  withIcon(icon: string): RecommendationBuilder {
    this.recommendation.icon = icon;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): RecommendationBuilder {
    this.recommendation.metadata = metadata;
    return this;
  }

  build(): Recommendation {
    if (!this.recommendation.ruleId || !this.recommendation.message) {
      throw new Error('Recommendation requires ruleId and message');
    }

    return {
      ruleId: this.recommendation.ruleId,
      ruleName: this.recommendation.ruleName || '',
      category: this.recommendation.category || RuleCategory.WEATHER,
      priority: this.recommendation.priority || RulePriority.MEDIUM,
      message: this.recommendation.message,
      icon: this.recommendation.icon,
      metadata: this.recommendation.metadata,
    };
  }
}

export function sortRecommendationsByPriority(recommendations: Recommendation[]): Recommendation[] {
  return [...recommendations].sort((a, b) => b.priority - a.priority);
}

export function getTopRecommendations(recommendations: Recommendation[], limit: number = 3): Recommendation[] {
  return sortRecommendationsByPriority(recommendations).slice(0, limit);
}

export function getIconForCategory(category: RuleCategory): string {
  const icons: Record<RuleCategory, string> = {
    [RuleCategory.WEATHER]: '🌤️',
    [RuleCategory.AIR_QUALITY]: '😷',
    [RuleCategory.TRANSIT]: '🚇',
    [RuleCategory.TRANSIT_COMPARISON]: '🚦',
  };
  return icons[category] || '📢';
}
