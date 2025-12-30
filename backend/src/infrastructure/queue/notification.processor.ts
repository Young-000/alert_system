import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  constructor(
    @Inject(SendNotificationUseCase)
    private sendNotificationUseCase: SendNotificationUseCase
  ) {
    super();
  }

  async process(job: Job<{ alertId: string }>): Promise<void> {
    const { alertId } = job.data;
    await this.sendNotificationUseCase.execute(alertId);
  }
}
