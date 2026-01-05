import { NotFoundException } from '@nestjs/common';
import { DeleteAlertUseCase } from './delete-alert.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { INotificationScheduler } from '@application/ports/notification-scheduler';
import { Alert, AlertType } from '@domain/entities/alert.entity';

describe('DeleteAlertUseCase', () => {
  let useCase: DeleteAlertUseCase;
  let alertRepository: jest.Mocked<IAlertRepository>;
  let notificationScheduler: jest.Mocked<INotificationScheduler>;

  const mockAlert = new Alert(
    'user-id',
    'Test Alert',
    '0 8 * * *',
    [AlertType.WEATHER],
    undefined,
    undefined,
    'alert-id'
  );

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

  it('should delete alert and cancel schedule when alert exists', async () => {
    alertRepository.findById.mockResolvedValue(mockAlert);
    alertRepository.delete.mockResolvedValue();
    notificationScheduler.cancelNotification.mockResolvedValue();

    await useCase.execute('alert-id');

    expect(alertRepository.findById).toHaveBeenCalledWith('alert-id');
    expect(alertRepository.delete).toHaveBeenCalledWith('alert-id');
    expect(notificationScheduler.cancelNotification).toHaveBeenCalledWith('alert-id');
  });

  it('should throw NotFoundException when alert does not exist', async () => {
    alertRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(NotFoundException);
    expect(alertRepository.findById).toHaveBeenCalledWith('non-existent-id');
    expect(alertRepository.delete).not.toHaveBeenCalled();
    expect(notificationScheduler.cancelNotification).not.toHaveBeenCalled();
  });
});
