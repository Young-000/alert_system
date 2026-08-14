import { UserApiClient } from './user-api.client';
import type { ApiClient } from './api-client';
import type { CreateUserDto, User } from './user-api.client';

// 상대 경로 import — @infrastructure/api 목 별칭을 타지 않는다.

const CREATED_USER: User = {
  id: 'user-1',
  email: 'commuter@example.com',
  name: '김출근',
};

function createApiClientStub(): {
  client: ApiClient;
  postMock: ReturnType<typeof vi.fn>;
} {
  const postMock = vi.fn().mockResolvedValue(CREATED_USER);
  return { client: { post: postMock } as unknown as ApiClient, postMock };
}

/**
 * POST /users 는 살아 있는 경로다(@Public + @Throttle, user.controller.ts).
 * 서버 CreateUserDto(backend/src/application/dto/create-user.dto.ts)는
 * email·password·name·phoneNumber를 **전부 필수**로 요구하고, 전역 ValidationPipe가
 * forbidNonWhitelisted로 동작한다. 필수 필드를 빠뜨린 요청은 항상 400이다.
 */
describe('UserApiClient — 회원 생성 요청 계약', () => {
  it('서버 필수 필드(password·phoneNumber)를 함께 보낸다', async () => {
    const { client, postMock } = createApiClientStub();
    const dto: CreateUserDto = {
      email: 'commuter@example.com',
      password: 'secret123',
      name: '김출근',
      phoneNumber: '01012345678',
    };

    const result = await new UserApiClient(client).createUser(dto);

    expect(postMock).toHaveBeenCalledWith('/users', dto);
    expect(result.id).toBe('user-1');
  });

  it('location은 선택 필드로 중첩 객체를 함께 보낼 수 있다', async () => {
    const { client, postMock } = createApiClientStub();
    const dto: CreateUserDto = {
      email: 'commuter@example.com',
      password: 'secret123',
      name: '김출근',
      phoneNumber: '01012345678',
      location: { address: '서울시 강남구', lat: 37.5, lng: 127.03 },
    };

    await new UserApiClient(client).createUser(dto);

    expect(postMock).toHaveBeenCalledWith('/users', dto);
  });
});
