import { Module } from '@nestjs/common';
import { WidgetController } from '../controllers/widget.controller';
import { WidgetDataService } from '@application/services/widget-data.service';
import { CommuteModule } from './commute.module';
import { SmartDepartureModule } from './smart-departure.module';
import { ExternalApiModule } from './external-api.module';
import { PostgresAlertRepository } from '@infrastructure/persistence/postgres-alert.repository';
import { PostgresSubwayStationRepository } from '@infrastructure/persistence/postgres-subway-station.repository';
import { BriefingAdviceService } from '@application/services/briefing-advice.service';

@Module({
  imports: [CommuteModule, SmartDepartureModule, ExternalApiModule],
  controllers: [WidgetController],
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
export class WidgetModule {}
