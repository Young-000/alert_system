import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  SolapiService,
  NoopSolapiService,
  SOLAPI_SERVICE,
} from './solapi.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SOLAPI_SERVICE,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('SOLAPI_API_KEY');
        const apiSecret = configService.get<string>('SOLAPI_API_SECRET');

        if (apiKey && apiSecret) {
          return new SolapiService(configService);
        }
        return new NoopSolapiService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [SOLAPI_SERVICE],
})
export class MessagingModule {}
