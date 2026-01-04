import { CreateAlertUseCase } from './create-alert.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { User } from '@domain/entities/user.entity';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { INotificationScheduler } from '@application/ports/notification-scheduler';

describe('CreateAlertUseCase', () => {
  let useCase: CreateAlertUseCase;
  let alertRepository: jest.Mocked<IAlertRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let notificationScheduler: jest.Mocked<INotificationScheduler>;

  beforeEach(() => {
    alertRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      delete: jest.fn(),
    };
    userRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    notificationScheduler = {
      scheduleNotification: jest.fn(),
      cancelNotification: jest.fn(),
    };
    useCase = new CreateAlertUseCase(alertRepository, userRepository, notificationScheduler);
  });

  it('should create an alert', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '출근 알림',
      schedule: '0 8 * * *',
      alertTypes: [AlertType.WEATHER],
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.name).toBe('출근 알림');
    expect(result.schedule).toBe('0 8 * * *');
    expect(result.alertTypes).toEqual([AlertType.WEATHER]);
    expect(userRepository.findById).toHaveBeenCalledWith(user.id);
    expect(alertRepository.save).toHaveBeenCalled();
    expect(notificationScheduler.scheduleNotification).toHaveBeenCalled();
  });

  it('should throw error if user not found', async () => {
    const dto: CreateAlertDto = {
      userId: 'non-existent-id',
      name: '출근 알림',
      schedule: '0 8 * * *',
      alertTypes: [AlertType.WEATHER],
    };
    userRepository.findById.mockResolvedValue(undefined);

    await expect(useCase.execute(dto)).rejects.toThrow('사용자를 찾을 수 없습니다.');
  });

  it('should create an alert with bus stop id', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '출근 알림',
      schedule: '0 8 * * *',
      alertTypes: [AlertType.BUS],
      busStopId: 'bus-stop-123',
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.busStopId).toBe('bus-stop-123');
  });
});
