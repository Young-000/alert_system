import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { InsightsController } from '../controllers/insights.controller';
import { CongestionController } from '../controllers/congestion.controller';
import { InsightsService } from '@application/services/insights/insights.service';
import { InsightsAggregationService } from '@application/services/insights/insights-aggregation.service';
import { CongestionService } from '@application/services/congestion/congestion.service';
import { CongestionAggregationService } from '@application/services/congestion/congestion-aggregation.service';
import { InsightsModule } from './insights.module';
import { CongestionModule } from './congestion.module';

/**
 * Regression guard for a Nest DI scoping trap: ConfigHostModule is @Global, but the
 * ConfigService *class token* is provided by ConfigModule, which is NOT global here
 * (no ConfigModule.forRoot({ isGlobal: true }) anywhere in the app). A feature module
 * that injects ConfigService without importing ConfigModule therefore fails to
 * bootstrap — and importing it in a sibling module (AuthModule) does not help.
 *
 * These tests build the same module shape the real feature modules use.
 */

/** Mimics AuthModule: imports ConfigModule but does not re-export it. */
@Module({ imports: [ConfigModule] })
class SiblingConfigOwnerModule {}

const stub = <T>(): T => ({}) as T;

describe('ConfigService availability in feature modules', () => {
  const buildModule = (imports: unknown[]) =>
    Test.createTestingModule({
      imports: [SiblingConfigOwnerModule, ...(imports as never[])],
      controllers: [InsightsController, CongestionController],
      providers: [
        { provide: InsightsService, useValue: stub<InsightsService>() },
        { provide: InsightsAggregationService, useValue: stub<InsightsAggregationService>() },
        { provide: CongestionService, useValue: stub<CongestionService>() },
        { provide: CongestionAggregationService, useValue: stub<CongestionAggregationService>() },
      ],
    }).compile();

  it('should fail to resolve ConfigService when ConfigModule is only imported by a sibling module', async () => {
    await expect(buildModule([])).rejects.toThrow(/ConfigService/);
  });

  it('should resolve ConfigService once the feature module imports ConfigModule itself', async () => {
    const moduleRef = await buildModule([ConfigModule]);

    expect(moduleRef.get(InsightsController)).toBeInstanceOf(InsightsController);
    expect(moduleRef.get(CongestionController)).toBeInstanceOf(CongestionController);
    expect(moduleRef.get(ConfigService)).toBeInstanceOf(ConfigService);
  });

  describe('real feature modules', () => {
    const importsOf = (moduleClass: object): unknown[] =>
      (Reflect.getMetadata('imports', moduleClass) as unknown[]) ?? [];

    it.each([
      ['InsightsModule', InsightsModule],
      ['CongestionModule', CongestionModule],
    ])('%s should import ConfigModule because its controller injects ConfigService', (_name, moduleClass) => {
      expect(importsOf(moduleClass)).toContain(ConfigModule);
    });
  });
});
