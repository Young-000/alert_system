import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { IUserPatternRepository } from '../../domain/repositories/user-pattern.repository';
import { IAlertRepository } from '../../domain/repositories/alert.repository';
import { PatternType, DEFAULT_PATTERNS } from '../../domain/entities/user-pattern.entity';
import { PredictionEngineService, PredictionResult } from '../services/prediction-engine.service';

export interface DepartureAdjustment {
  reason: string;
  minutes: number;
}

export interface DeparturePrediction {
  baseTime: string; // HH:mm format
  recommendedTime: string; // HH:mm format
  adjustments: DepartureAdjustment[];
  explanation: string;
  confidence: number;
}

export interface CurrentConditions {
  weather?: string;
  transitDelayMinutes?: number;
  isRaining?: boolean;
  isSnowing?: boolean;
  temperature?: number;
}

export const USER_PATTERN_REPOSITORY = Symbol('USER_PATTERN_REPOSITORY');

@Injectable()
export class PredictOptimalDepartureUseCase {
  private readonly logger = new Logger(PredictOptimalDepartureUseCase.name);

  // Weather impact in minutes (how much earlier to leave)
  private readonly WEATHER_IMPACT = {
    rain: 10,
    snow: 15,
    heavyRain: 15,
    heavySnow: 20,
  };

  constructor(
    @Optional()
    @Inject(USER_PATTERN_REPOSITORY)
    private readonly patternRepository: IUserPatternRepository | null,
    @Optional()
    @Inject('ALERT_REPOSITORY')
    private readonly alertRepository: IAlertRepository | null,
    @Optional()
    @Inject(PredictionEngineService)
    private readonly predictionEngine: PredictionEngineService | null,
  ) {}

  async execute(
    userId: string,
    alertId: string,
    conditions?: CurrentConditions,
  ): Promise<DeparturePrediction> {
    // Try ML prediction engine first (if available)
    if (this.predictionEngine) {
      try {
        const mlResult = await this.predictionEngine.predict(userId, {
          weather: conditions?.weather,
          temperature: conditions?.temperature,
          transitDelayMinutes: conditions?.transitDelayMinutes,
        });

        return this.convertPredictionResult(mlResult, alertId);
      } catch (error) {
        this.logger.warn(`ML prediction failed, falling back to legacy: ${error}`);
        // Fall through to legacy logic
      }
    }

    // Legacy prediction logic (fallback)
    return this.legacyPredict(userId, alertId, conditions);
  }

  /**
   * Convert PredictionResult from ML engine to the existing DeparturePrediction shape.
   * This keeps backward compatibility while internally using the new engine.
   */
  private convertPredictionResult(
    result: PredictionResult,
    _alertId: string,
  ): DeparturePrediction {
    const adjustments: DepartureAdjustment[] = result.factors
      .filter(f => f.type !== 'base_pattern' && f.impact !== 0)
      .map(f => ({
        reason: f.label,
        minutes: f.impact,
      }));

    const basePattern = result.factors.find(f => f.type === 'base_pattern');
    const baseTime = basePattern
      ? result.departureTime // When only base_pattern, departure=base
      : this.removeFactorImpacts(result.departureTime, adjustments);

    return {
      baseTime,
      recommendedTime: result.departureTime,
      adjustments,
      explanation: this.generateExplanation(adjustments),
      confidence: result.confidence,
    };
  }

  /**
   * Reverse-calculate baseTime from recommendedTime by undoing adjustment impacts.
   */
  private removeFactorImpacts(
    recommendedTime: string,
    adjustments: DepartureAdjustment[],
  ): string {
    const [hours, minutes] = recommendedTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;

    // Undo adjustments to get base time
    for (const adj of adjustments) {
      totalMinutes -= adj.minutes;
    }

    totalMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private async legacyPredict(
    userId: string,
    alertId: string,
    conditions?: CurrentConditions,
  ): Promise<DeparturePrediction> {
    // 1. Get user's departure pattern
    const baseTime = await this.getBaseDepartureTime(userId, alertId);

    // 2. Calculate adjustments based on current conditions
    const adjustments = this.calculateAdjustments(conditions);

    // 3. Calculate recommended time
    const recommendedTime = this.applyAdjustments(baseTime, adjustments);

    // 4. Generate explanation
    const explanation = this.generateExplanation(adjustments);

    // 5. Get confidence level
    const confidence = await this.getConfidence(userId);

    return {
      baseTime,
      recommendedTime,
      adjustments,
      explanation,
      confidence,
    };
  }

  private async getBaseDepartureTime(
    userId: string,
    alertId: string,
  ): Promise<string> {
    // Try to get learned pattern first
    if (this.patternRepository) {
      const pattern = await this.patternRepository.findByUserIdAndType(
        userId,
        PatternType.DEPARTURE_TIME,
      );

      if (pattern && pattern.confidence >= 0.5) {
        const value = pattern.value as { averageTime?: string };
        if (value.averageTime) {
          return value.averageTime;
        }
      }
    }

    // Fallback to alert's scheduled time
    if (this.alertRepository) {
      const alert = await this.alertRepository.findById(alertId);
      if (alert?.notificationTime) {
        return alert.notificationTime;
      }
    }

    // Default fallback
    const now = new Date();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMorning = now.getHours() < 12;

    if (isMorning) {
      return isWeekday
        ? DEFAULT_PATTERNS.departureTime.morning.weekday
        : DEFAULT_PATTERNS.departureTime.morning.weekend;
    }
    return DEFAULT_PATTERNS.departureTime.evening.weekday;
  }

  private calculateAdjustments(
    conditions?: CurrentConditions,
  ): DepartureAdjustment[] {
    const adjustments: DepartureAdjustment[] = [];

    if (!conditions) return adjustments;

    // Transit delay adjustment
    if (conditions.transitDelayMinutes && conditions.transitDelayMinutes > 5) {
      adjustments.push({
        reason: '대중교통 지연',
        minutes: -conditions.transitDelayMinutes,
      });
    }

    // Weather adjustments
    if (conditions.isSnowing) {
      adjustments.push({
        reason: '눈 예보',
        minutes: -this.WEATHER_IMPACT.snow,
      });
    } else if (conditions.isRaining) {
      adjustments.push({
        reason: '비 예보',
        minutes: -this.WEATHER_IMPACT.rain,
      });
    }

    // Temperature-based adjustment (extreme cold/heat)
    if (conditions.temperature !== undefined) {
      if (conditions.temperature < -10) {
        adjustments.push({
          reason: '한파 주의',
          minutes: -5,
        });
      } else if (conditions.temperature > 35) {
        adjustments.push({
          reason: '폭염 주의',
          minutes: -5,
        });
      }
    }

    return adjustments;
  }

  private applyAdjustments(
    baseTime: string,
    adjustments: DepartureAdjustment[],
  ): string {
    const [hours, minutes] = baseTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;

    // Apply all adjustments
    for (const adj of adjustments) {
      totalMinutes += adj.minutes;
    }

    // Ensure valid time range
    totalMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));

    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;

    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }

  private generateExplanation(adjustments: DepartureAdjustment[]): string {
    if (adjustments.length === 0) {
      return '평소 출발 시간대로 출발하세요.';
    }

    const reasons = adjustments.map((adj) => {
      const absMinutes = Math.abs(adj.minutes);
      const direction = adj.minutes < 0 ? '일찍' : '늦게';
      return `${adj.reason}으로 ${absMinutes}분 ${direction}`;
    });

    return `${reasons.join(', ')} 출발을 권장합니다.`;
  }

  private async getConfidence(userId: string): Promise<number> {
    if (!this.patternRepository) {
      return 0.3; // Cold start confidence
    }

    const pattern = await this.patternRepository.findByUserIdAndType(
      userId,
      PatternType.DEPARTURE_TIME,
    );

    return pattern?.confidence ?? 0.3;
  }
}
