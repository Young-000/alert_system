import { Module } from '@nestjs/common';
import { AlimtalkService, NoopAlimtalkService } from './alimtalk.service';

@Module({
  providers: [
    {
      provide: 'IAlimtalkService',
      useFactory: () => {
        if (process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET) {
          return new AlimtalkService();
        }
        return new NoopAlimtalkService();
      },
    },
  ],
  exports: ['IAlimtalkService'],
})
export class MessagingModule {}
