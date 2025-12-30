import { NotificationProcessor } from './notification.processor';
import { SendNotificationUseCase } from '@application/use-cases/send-notification.use-case';
import { Job } from 'bullmq';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let sendNotificationUseCase: jest.Mocked<SendNotificationUseCase>;

  beforeEach(() => {
    sendNotificationUseCase = {
      execute: jest.fn(),
    } as any;

    processor = new NotificationProcessor(sendNotificationUseCase);
  });

  it('should process notification job', async () => {
    const job = {
      id: 'job-123',
      data: { alertId: 'alert-456' },
    } as Job<{ alertId: string }>;

    sendNotificationUseCase.execute.mockResolvedValue();

    await processor.process(job);

    expect(sendNotificationUseCase.execute).toHaveBeenCalledWith('alert-456');
  });

  it('should throw error if notification fails', async () => {
    const job = {
      id: 'job-123',
      data: { alertId: 'alert-456' },
    } as Job<{ alertId: string }>;

    const error = new Error('Notification failed');
    sendNotificationUseCase.execute.mockRejectedValue(error);

    await expect(processor.process(job)).rejects.toThrow('Notification failed');
  });
});
