import { Module } from '@nestjs/common';
import { BriefingController } from '../controllers/briefing.controller';
import { BriefingAdviceService } from '@application/services/briefing-advice.service';
import { WidgetDataService } from '@application/services/widget-data.service';
import { CommuteModule } from './commute.module';
import { SmartDepartureModule } from './smart-departure.module';
import { ExternalApiModule } from './external-api.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';

@Module({
  imports: [CommuteModule, SmartDepartureModule, ExternalApiModule],
  controllers: [BriefingController],
  providers: [
    {
      provide: 'IAlertRepository',
      useClass: PostgresAlertRepository,
    },
    {
      provide: 'ISubwayStationRepository',
      useClass: PostgresSubwayStationRepository,
    },
    BriefingAdviceService,
    WidgetDataService,
  ],
})
export class BriefingModule {}
