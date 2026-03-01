import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// TypeORM Entity
import { AlternativeMappingEntity } from '@infrastructure/persistence/typeorm/alternative-mapping.entity';

// Repository
import { AlternativeMappingRepositoryImpl } from '@infrastructure/persistence/repositories/alternative-mapping.repository';
import { ALTERNATIVE_MAPPING_REPOSITORY } from '@domain/repositories/alternative-mapping.repository';

// Services
import { RouteDelayCheckService } from '@application/services/route-delay-check.service';
import { AlternativeSuggestionService } from '@application/services/alternative-suggestion.service';

// Subway API Client
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';

// Controller
import { DelayStatusController } from '../controllers/delay-status.controller';

// Commute module for route repository
import { CommuteModule } from './commute.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlternativeMappingEntity]),
    CommuteModule,
  ],
  controllers: [DelayStatusController],
  providers: [
    // Repository
    {
      provide: ALTERNATIVE_MAPPING_REPOSITORY,
      useClass: AlternativeMappingRepositoryImpl,
    },
    // Subway API Client
    {
      provide: 'ISubwayApiClient',
      useFactory: () => {
        const apiKey =
          process.env.SUBWAY_REALTIME_API_KEY ||
          process.env.SUBWAY_API_KEY ||
          '';
        return new SubwayApiClient(apiKey);
      },
    },
    // Services
    RouteDelayCheckService,
    AlternativeSuggestionService,
  ],
  exports: [
    ALTERNATIVE_MAPPING_REPOSITORY,
    RouteDelayCheckService,
    AlternativeSuggestionService,
  ],
})
export class AlternativeRouteModule {}
