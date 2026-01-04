import { UpdateUserLocationUseCase } from './update-user-location.use-case';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';

describe('UpdateUserLocationUseCase', () => {
  let useCase: UpdateUserLocationUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    useCase = new UpdateUserLocationUseCase(userRepository);
  });

  it('should update user location', async () => {
    const user = new User('user@example.com', 'John Doe');
    userRepository.findById.mockResolvedValue(user);
    userRepository.save.mockResolvedValue();

    const updated = await useCase.execute(user.id, {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.978,
    });

    expect(updated.location?.address).toBe('Seoul');
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('should throw if user is missing', async () => {
    userRepository.findById.mockResolvedValue(undefined);

    await expect(
      useCase.execute('missing-id', { address: 'Seoul', lat: 0, lng: 0 })
    ).rejects.toThrow('사용자를 찾을 수 없습니다.');
  });
});
