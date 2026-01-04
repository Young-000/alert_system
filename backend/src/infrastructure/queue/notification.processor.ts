import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  constructor(private sendNotificationUseCase: SendNotificationUseCase) {
    super();
  }

  async process(job: Job<{ alertId: string }>): Promise<void> {
    if (job.name !== 'send-notification') {
      return;
    }
    await this.sendNotificationUseCase.execute(job.data.alertId);
  }
}
