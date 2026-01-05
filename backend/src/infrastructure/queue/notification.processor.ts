import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { SendAlimtalkUseCase } from '@application/use-cases/send-alimtalk.use-case';

interface NotificationJobData {
  alertId: string;
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject('SendAlimtalkUseCase')
    private sendAlimtalkUseCase: SendAlimtalkUseCase
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(`Processing notification job: ${job.id}`);

    try {
      const { alertId } = job.data;

      const result = await this.sendAlimtalkUseCase.execute({ alertId });

      if (result.success) {
        this.logger.log(`Notification sent successfully for alert: ${alertId}`);
      } else {
        this.logger.warn(`Failed to send notification for alert: ${alertId} - ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Error processing notification job: ${error}`);
      throw error; // This will trigger retry
    }
  }
}
