import { DataSource } from 'typeorm';
import { PostgresUserRepository } from './postgres-user.repository';
import { UserEntity } from './typeorm/user.entity';
import { User } from '@domain/entities/user.entity';

describe('PostgresUserRepository', () => {
  let dataSource: DataSource;
  let repository: PostgresUserRepository;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'alert_user',
      password: 'alert_password',
      database: 'alert_system_test',
      entities: [UserEntity],
      synchronize: true,
      dropSchema: true,
    });

    await dataSource.initialize();
    repository = new PostgresUserRepository(dataSource);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('should save a user', async () => {
    const user = new User('user@example.com', 'John Doe');
    
    await repository.save(user);
    
    const found = await repository.findById(user.id);
    expect(found).toBeDefined();
    expect(found?.email).toBe('user@example.com');
    expect(found?.name).toBe('John Doe');
  });

  it('should find user by id', async () => {
    const user = new User('user@example.com', 'John Doe');
    await repository.save(user);
    
    const found = await repository.findById(user.id);
    
    expect(found).toBeDefined();
    expect(found?.email).toBe('user@example.com');
  });

  it('should return undefined when user not found', async () => {
    const found = await repository.findById('non-existent-id');
    
    expect(found).toBeUndefined();
  });

  it('should find user by email', async () => {
    const user = new User('user@example.com', 'John Doe');
    await repository.save(user);
    
    const found = await repository.findByEmail('user@example.com');
    
    expect(found).toBeDefined();
    expect(found?.email).toBe('user@example.com');
  });
});

