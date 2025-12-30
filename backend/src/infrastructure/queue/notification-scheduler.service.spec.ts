import { NotificationSchedulerService } from './notification-scheduler.service';
import { Queue } from 'bullmq';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { Alert, AlertType } from '@domain/entities/alert.entity';

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let queue: jest.Mocked<Queue>;
  let alertRepository: jest.Mocked<IAlertRepository>;

  beforeEach(() => {
    queue = {
      add: jest.fn(),
    } as any;
    alertRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      delete: jest.fn(),
    };
    service = new NotificationSchedulerService(queue, alertRepository);
  });

  it('should schedule notification for alert', async () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    (queue.add as jest.Mock).mockResolvedValue({ id: 'job-id' });

    await service.scheduleNotification(alert);

    expect(queue.add).toHaveBeenCalledWith(
      'send-notification',
      { alertId: alert.id },
      expect.objectContaining({
        repeat: expect.objectContaining({
          pattern: '0 8 * * *',
        }),
      })
    );
  });

  it('should cancel scheduled notification', async () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    (queue.add as jest.Mock).mockResolvedValue({ id: 'job-id' });
    (queue.getRepeatableJobs as jest.Mock) = jest.fn().mockResolvedValue([
      { id: `alert-${alert.id}`, key: `alert-${alert.id}` },
    ]);
    (queue.removeRepeatableByKey as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    await service.scheduleNotification(alert);

    await service.cancelNotification(alert.id);

    expect(queue.removeRepeatableByKey).toHaveBeenCalled();
  });
});

