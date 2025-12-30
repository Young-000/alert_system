import { DataSource } from 'typeorm';
import { PostgresAlertRepository } from './postgres-alert.repository';
import { AlertEntity } from './typeorm/alert.entity';
import { UserEntity } from './typeorm/user.entity';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { User } from '@domain/entities/user.entity';

describe('PostgresAlertRepository', () => {
  let dataSource: DataSource;
  let repository: PostgresAlertRepository;
  let user: User;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'alert_user',
      password: 'alert_password',
      database: 'alert_system_test',
      entities: [UserEntity, AlertEntity],
      synchronize: true,
      dropSchema: true,
    });

    await dataSource.initialize();
    repository = new PostgresAlertRepository(dataSource);
    
    // Create a test user
    const userRepo = dataSource.getRepository(UserEntity);
    const userEntity = userRepo.create({
      email: 'user@example.com',
      name: 'John Doe',
    });
    await userRepo.save(userEntity);
    user = new User('user@example.com', 'John Doe');
    (user as any).id = userEntity.id;
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('should save an alert', async () => {
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    
    await repository.save(alert);
    
    const found = await repository.findById(alert.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('출근 알림');
  });

  it('should find alert by id', async () => {
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    await repository.save(alert);
    
    const found = await repository.findById(alert.id);
    
    expect(found).toBeDefined();
    expect(found?.name).toBe('출근 알림');
  });

  it('should find alerts by user id', async () => {
    const alert1 = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    const alert2 = new Alert(user.id, '퇴근 알림', '0 18 * * *', [AlertType.WEATHER]);
    
    await repository.save(alert1);
    await repository.save(alert2);
    
    const found = await repository.findByUserId(user.id);
    
    expect(found).toHaveLength(2);
  });

  it('should delete an alert', async () => {
    const alert = new Alert(user.id, '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    await repository.save(alert);
    
    await repository.delete(alert.id);
    
    const found = await repository.findById(alert.id);
    expect(found).toBeUndefined();
  });
});

