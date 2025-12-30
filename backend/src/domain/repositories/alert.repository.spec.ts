import { AlertRepository } from './alert.repository';
import { Alert, AlertType } from '../entities/alert.entity';

describe('AlertRepository', () => {
  let repository: AlertRepository;

  beforeEach(() => {
    repository = new AlertRepository();
  });

  it('should save an alert', async () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    
    await repository.save(alert);
    
    const found = await repository.findById(alert.id);
    expect(found).toEqual(alert);
  });

  it('should find alert by id', async () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    await repository.save(alert);
    
    const found = await repository.findById(alert.id);
    
    expect(found).toEqual(alert);
  });

  it('should return undefined when alert not found', async () => {
    const found = await repository.findById('non-existent-id');
    
    expect(found).toBeUndefined();
  });

  it('should find alerts by user id', async () => {
    const alert1 = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    const alert2 = new Alert('user-id', '퇴근 알림', '0 18 * * *', [AlertType.WEATHER]);
    const alert3 = new Alert('other-user-id', '알림', '0 12 * * *', [AlertType.WEATHER]);
    
    await repository.save(alert1);
    await repository.save(alert2);
    await repository.save(alert3);
    
    const found = await repository.findByUserId('user-id');
    
    expect(found).toHaveLength(2);
    expect(found).toContainEqual(alert1);
    expect(found).toContainEqual(alert2);
  });

  it('should delete an alert', async () => {
    const alert = new Alert('user-id', '출근 알림', '0 8 * * *', [AlertType.WEATHER]);
    await repository.save(alert);
    
    await repository.delete(alert.id);
    
    const found = await repository.findById(alert.id);
    expect(found).toBeUndefined();
  });
});

