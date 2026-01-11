import { CreateUserUseCase } from './create-user.use-case';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    userRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    useCase = new CreateUserUseCase(userRepository);
  });

  it('should create a user', async () => {
    const dto: CreateUserDto = {
      email: 'user@example.com',
      name: 'John Doe',
      password: 'password123',
    };
    userRepository.findByEmail.mockResolvedValue(undefined);
    userRepository.save.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.email).toBe('user@example.com');
    expect(result.name).toBe('John Doe');
    expect(userRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('should throw ConflictException when email already exists', async () => {
    const dto: CreateUserDto = {
      email: 'user@example.com',
      name: 'John Doe',
      password: 'password123',
    };
    const existingUser = new User('user@example.com', 'Existing User');
    userRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(useCase.execute(dto)).rejects.toThrow('이미 등록된 이메일입니다.');
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('should create a user with location', async () => {
    const dto: CreateUserDto = {
      email: 'user@example.com',
      name: 'John Doe',
      password: 'password123',
      location: {
        address: 'Seoul',
        lat: 37.5665,
        lng: 126.9780,
      },
    };
    userRepository.findByEmail.mockResolvedValue(undefined);
    userRepository.save.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.location).toEqual(dto.location);
  });
});

