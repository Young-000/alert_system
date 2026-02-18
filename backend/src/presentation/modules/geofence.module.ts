import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// TypeORM Entities
import { UserPlaceEntity } from '@infrastructure/persistence/typeorm/user-place.entity';
import { CommuteEventEntity } from '@infrastructure/persistence/typeorm/commute-event.entity';

// Repository Implementations
import { UserPlaceRepositoryImpl } from '@infrastructure/persistence/repositories/user-place.repository';
import { CommuteEventRepositoryImpl } from '@infrastructure/persistence/repositories/commute-event.repository';

// Repository Symbols
import { USER_PLACE_REPOSITORY } from '@domain/repositories/user-place.repository';
import { COMMUTE_EVENT_REPOSITORY } from '@domain/repositories/commute-event.repository';

// Use Cases
import { ManagePlacesUseCase } from '@application/use-cases/manage-places.use-case';
import { ProcessCommuteEventUseCase } from '@application/use-cases/process-commute-event.use-case';

// Controllers
import { PlaceController } from '../controllers/place.controller';
import { CommuteEventController } from '../controllers/commute-event.controller';

// Import CommuteModule for session/route repository access
import { CommuteModule } from './commute.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPlaceEntity,
      CommuteEventEntity,
    ]),
    CommuteModule,
  ],
  controllers: [PlaceController, CommuteEventController],
  providers: [
    // Repositories
    {
      provide: USER_PLACE_REPOSITORY,
      useClass: UserPlaceRepositoryImpl,
    },
    {
      provide: COMMUTE_EVENT_REPOSITORY,
      useClass: CommuteEventRepositoryImpl,
    },
    // Use Cases
    ManagePlacesUseCase,
    ProcessCommuteEventUseCase,
  ],
  exports: [
    USER_PLACE_REPOSITORY,
    COMMUTE_EVENT_REPOSITORY,
    ManagePlacesUseCase,
    ProcessCommuteEventUseCase,
  ],
})
export class GeofenceModule {}
