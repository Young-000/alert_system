import { User, UserLocation } from '@domain/entities/user.entity';

/**
 * 사용자 정보 응답 DTO
 * 민감한 정보(passwordHash)를 제외하고 반환
 */
export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  location?: UserLocation;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.location = user.location;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    // passwordHash는 의도적으로 제외
    return dto;
  }

  static fromEntities(users: User[]): UserResponseDto[] {
    return users.map(user => UserResponseDto.fromEntity(user));
  }
}
