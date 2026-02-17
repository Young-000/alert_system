import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserController } from './user.controller';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { GetUserUseCase } from '@application/use-cases/get-user.use-case';
import { UpdateUserLocationUseCase } from '@application/use-cases/update-user-location.use-case';
import { UserResponseDto } from '@application/dto/user-response.dto';
import { User } from '@domain/entities/user.entity';

describe('UserController', () => {
  let controller: UserController;
  let createUserUseCase: jest.Mocked<CreateUserUseCase>;
  let getUserUseCase: jest.Mocked<GetUserUseCase>;
  let updateUserLocationUseCase: jest.Mocked<UpdateUserLocationUseCase>;

  const OWNER_ID = 'user-123';
  const OTHER_USER_ID = 'other-user';

  const mockUser = new User(
    'test@test.com',
    '테스트유저',
    '01012345678',
    'hashed-pw',
    { address: '서울시청', lat: 37.5665, lng: 126.978 },
    undefined,
    OWNER_ID,
  );

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  beforeEach(async () => {
    createUserUseCase = { execute: jest.fn() } as any;
    getUserUseCase = { execute: jest.fn() } as any;
    updateUserLocationUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: CreateUserUseCase, useValue: createUserUseCase },
        { provide: GetUserUseCase, useValue: getUserUseCase },
        { provide: UpdateUserLocationUseCase, useValue: updateUserLocationUseCase },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('create', () => {
    const createDto = {
      email: 'test@test.com',
      password: 'password123',
      name: '테스트유저',
      phoneNumber: '01012345678',
    };

    it('사용자 생성 성공', async () => {
      createUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await controller.create(createDto);

      expect(createUserUseCase.execute).toHaveBeenCalledWith(createDto);
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.email).toBe('test@test.com');
      expect(result.name).toBe('테스트유저');
    });

    it('중복 이메일 시 에러 전파', async () => {
      createUserUseCase.execute.mockRejectedValue(new Error('이미 존재하는 이메일입니다.'));

      await expect(controller.create(createDto)).rejects.toThrow('이미 존재하는 이메일입니다.');
    });

    it('응답에 passwordHash가 포함되지 않는다', async () => {
      createUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await controller.create(createDto);

      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('자신의 정보 조회 성공', async () => {
      getUserUseCase.execute.mockResolvedValue(mockUser);

      const result = await controller.findOne(OWNER_ID, mockRequest(OWNER_ID));

      expect(getUserUseCase.execute).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.id).toBe(OWNER_ID);
    });

    it('다른 사용자의 정보 조회 시 ForbiddenException', async () => {
      await expect(
        controller.findOne(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(getUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('다른 사용자 접근 시 올바른 에러 메시지', async () => {
      await expect(
        controller.findOne(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow('다른 사용자의 정보를 조회할 수 없습니다.');
    });
  });

  describe('updateLocation', () => {
    const updateDto = {
      location: { address: '강남역', lat: 37.498, lng: 127.0276 },
    };

    it('자신의 위치 수정 성공', async () => {
      const updatedUser = new User(
        'test@test.com',
        '테스트유저',
        '01012345678',
        'hashed-pw',
        { address: '강남역', lat: 37.498, lng: 127.0276 },
        undefined,
        OWNER_ID,
      );
      updateUserLocationUseCase.execute.mockResolvedValue(updatedUser);

      const result = await controller.updateLocation(OWNER_ID, updateDto, mockRequest(OWNER_ID));

      expect(updateUserLocationUseCase.execute).toHaveBeenCalledWith(OWNER_ID, updateDto.location);
      expect(result).toBeInstanceOf(UserResponseDto);
    });

    it('다른 사용자의 위치 수정 시 ForbiddenException', async () => {
      await expect(
        controller.updateLocation(OWNER_ID, updateDto, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(updateUserLocationUseCase.execute).not.toHaveBeenCalled();
    });

    it('다른 사용자의 위치 수정 시 올바른 에러 메시지', async () => {
      await expect(
        controller.updateLocation(OWNER_ID, updateDto, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow('다른 사용자의 위치를 수정할 수 없습니다.');
    });
  });
});
