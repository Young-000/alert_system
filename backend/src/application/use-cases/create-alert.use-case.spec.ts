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
      findAll: jest.fn(),
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

  it('should create an alert with subway station id', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '지하철 알림',
      schedule: '0 7 * * 1-5',
      alertTypes: [AlertType.SUBWAY],
      subwayStationId: 'station-456',
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.subwayStationId).toBe('station-456');
  });

  it('should create an alert with multiple alert types', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '종합 출근 알림',
      schedule: '0 8 * * 1-5',
      alertTypes: [AlertType.WEATHER, AlertType.AIR_QUALITY, AlertType.BUS, AlertType.SUBWAY],
      busStopId: 'bus-123',
      subwayStationId: 'station-456',
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.alertTypes).toEqual([AlertType.WEATHER, AlertType.AIR_QUALITY, AlertType.BUS, AlertType.SUBWAY]);
    expect(result.alertTypes).toHaveLength(4);
    expect(result.busStopId).toBe('bus-123');
    expect(result.subwayStationId).toBe('station-456');
  });

  it('should create alert with air quality type only', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '미세먼지 알림',
      schedule: '0 6 * * *',
      alertTypes: [AlertType.AIR_QUALITY],
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.alertTypes).toEqual([AlertType.AIR_QUALITY]);
    expect(result.name).toBe('미세먼지 알림');
  });

  it('should create alert and call scheduler with the alert', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '퇴근 알림',
      schedule: '0 18 * * 1-5',
      alertTypes: [AlertType.WEATHER],
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(notificationScheduler.scheduleNotification).toHaveBeenCalledTimes(1);
    expect(notificationScheduler.scheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '퇴근 알림',
        schedule: '0 18 * * 1-5',
      }),
    );
  });

  it('should create alert with weekend schedule', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '주말 알림',
      schedule: '0 10 * * 6,0',
      alertTypes: [AlertType.WEATHER],
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.schedule).toBe('0 10 * * 6,0');
  });

  it('should create alert with hourly schedule', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '시간별 알림',
      schedule: '0 * * * *',
      alertTypes: [AlertType.AIR_QUALITY],
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.schedule).toBe('0 * * * *');
  });

  it('should set alert as enabled by default', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '기본 알림',
      schedule: '0 8 * * *',
      alertTypes: [AlertType.WEATHER],
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.enabled).toBe(true);
  });

  it('should generate unique id for each alert', async () => {
    const user = new User('user@example.com', 'John Doe');
    const dto: CreateAlertDto = {
      userId: user.id,
      name: '알림 1',
      schedule: '0 8 * * *',
      alertTypes: [AlertType.WEATHER],
    };
    userRepository.findById.mockResolvedValue(user);
    alertRepository.save.mockResolvedValue();
    notificationScheduler.scheduleNotification.mockResolvedValue();

    const result1 = await useCase.execute(dto);
    const result2 = await useCase.execute({ ...dto, name: '알림 2' });

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toBe(result2.id);
  });
});
