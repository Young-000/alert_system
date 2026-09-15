import { DataSource } from 'typeorm';
import { PostgresAlertRepository } from './postgres-alert.repository';
import { AlertEntity } from './typeorm/alert.entity';
import { UserEntity } from './typeorm/user.entity';
import { Alert, AlertType } from '@domain/entities/alert.entity';
import { User } from '@domain/entities/user.entity';

const shouldRun = process.env.RUN_DB_TESTS === 'true';
const describeDb = shouldRun ? describe : describe.skip;

describeDb('PostgresAlertRepository', () => {
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
      phoneNumber: '01012345678',
    });
    await userRepo.save(userEntity);
    user = new User('user@example.com', 'John Doe', '01012345678');
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

/**
 * 위 describeDb 블록은 Postgres 실물이 있어야 돌아간다(RUN_DB_TESTS).
 * 아래는 DB 없이 조회 옵션 계약만 고정하는 블록이다 — `/alerts` 목록의 순서는
 * 서버가 정하는데, 프론트에 정렬이 없어서(AlertList가 받은 배열을 그대로 map)
 * 여기서 order를 빠뜨리면 화면 순서가 Postgres의 물리적 행 순서에 끌려간다.
 * 알림을 토글하면 UPDATE가 행을 옮길 수 있어 목록이 재배열돼 보인다.
 * InMemory 구현(Map)은 삽입순을 보장하므로 이 결함을 재현하지 못한다.
 */
describe('PostgresAlertRepository — 조회 정렬 계약', () => {
  const createRepository = (): {
    repository: PostgresAlertRepository;
    find: jest.Mock;
  } => {
    const find = jest.fn().mockResolvedValue([]);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ find }),
    } as unknown as DataSource;

    return { repository: new PostgresAlertRepository(dataSource), find };
  };

  it('findByUserId는 생성 시각 오름차순으로 정렬해 조회한다', async () => {
    const { repository, find } = createRepository();

    await repository.findByUserId('user-1');

    expect(find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: { createdAt: 'ASC' },
    });
  });
});
