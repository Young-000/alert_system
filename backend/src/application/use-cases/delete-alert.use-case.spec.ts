import { DeleteAlertUseCase } from './delete-alert.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

describe('DeleteAlertUseCase', () => {
  let useCase: DeleteAlertUseCase;
  let alertRepository: jest.Mocked<IAlertRepository>;
  let notificationScheduler: jest.Mocked<INotificationScheduler>;

  beforeEach(() => {
    alertRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      delete: jest.fn(),
    };
    notificationScheduler = {
      scheduleNotification: jest.fn(),
      cancelNotification: jest.fn(),
    };
    useCase = new DeleteAlertUseCase(alertRepository, notificationScheduler);
  });

  it('should delete alert and cancel schedule', async () => {
    alertRepository.delete.mockResolvedValue();
    notificationScheduler.cancelNotification.mockResolvedValue();

    await useCase.execute('alert-id');

    expect(alertRepository.delete).toHaveBeenCalledWith('alert-id');
    expect(notificationScheduler.cancelNotification).toHaveBeenCalledWith('alert-id');
  });
});
