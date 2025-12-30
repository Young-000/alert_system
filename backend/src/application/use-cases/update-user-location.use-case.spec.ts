import { NotFoundException } from '@nestjs/common';
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
    const location = {
      address: 'Seoul',
      lat: 37.5665,
      lng: 126.9780,
    };

    userRepository.findById.mockResolvedValue(user);
    userRepository.save.mockResolvedValue();

    const result = await useCase.execute(user.id, location);

    expect(result.location).toEqual(location);
    expect(userRepository.findById).toHaveBeenCalledWith(user.id);
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException if user not found', async () => {
    userRepository.findById.mockResolvedValue(undefined);

    await expect(
      useCase.execute('non-existent-id', {
        address: 'Seoul',
        lat: 37.5665,
        lng: 126.9780,
      })
    ).rejects.toThrow(NotFoundException);
  });
});
