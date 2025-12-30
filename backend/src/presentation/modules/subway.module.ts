import { Module } from '@nestjs/common';
import { SubwayController } from '../controllers/subway.controller';
import { GetSubwayArrivalUseCase } from '@application/use-cases/get-subway-arrival.use-case';
import { SubwayApiClient } from '@infrastructure/external-apis/subway-api.client';

@Module({
  controllers: [SubwayController],
  providers: [
    {
      provide: 'ISubwayApiClient',
      useFactory: () => {
        const apiKey = process.env.SUBWAY_API_KEY || '';
        return new SubwayApiClient(apiKey);
      },
    },
    GetSubwayArrivalUseCase,
  ],
})
export class SubwayModule {}
