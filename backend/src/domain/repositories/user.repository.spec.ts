import { UserRepository } from './user.repository';
import { User } from '../entities/user.entity';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
  });

  it('should save a user', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678');

    await repository.save(user);
    
    const found = await repository.findById(user.id);
    expect(found).toEqual(user);
  });

  it('should find user by id', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678');
    await repository.save(user);
    
    const found = await repository.findById(user.id);
    
    expect(found).toEqual(user);
  });

  it('should return undefined when user not found', async () => {
    const found = await repository.findById('non-existent-id');
    
    expect(found).toBeUndefined();
  });

  it('should find user by email', async () => {
    const user = new User('user@example.com', 'John Doe', '01012345678');
    await repository.save(user);
    
    const found = await repository.findByEmail('user@example.com');
    
    expect(found).toEqual(user);
  });

  it('should return undefined when user not found by email', async () => {
    const found = await repository.findByEmail('notfound@example.com');
    
    expect(found).toBeUndefined();
  });
});

