import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  MaxLength,
} from 'class-validator';

const MISSION_TYPES = ['commute', 'return'] as const;

// 이모지 하나는 ZWJ·변이 선택자 조합으로 여러 코드유닛이 될 수 있다.
const MAX_EMOJI_LENGTH = 16;

export class CreateMissionDto {
  @IsString()
  @IsNotEmpty({ message: '미션 제목은 필수입니다.' })
  @MaxLength(100, { message: '미션 제목은 100자 이내여야 합니다.' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_EMOJI_LENGTH, { message: '이모지 형식이 올바르지 않습니다.' })
  emoji?: string;

  @IsIn(MISSION_TYPES, { message: '미션 타입은 commute 또는 return이어야 합니다.' })
  missionType: 'commute' | 'return';
}

export class UpdateMissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '미션 제목은 100자 이내여야 합니다.' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_EMOJI_LENGTH, { message: '이모지 형식이 올바르지 않습니다.' })
  emoji?: string;

  @IsOptional()
  @IsIn(MISSION_TYPES, { message: '미션 타입은 commute 또는 return이어야 합니다.' })
  missionType?: 'commute' | 'return';
}

export class ReorderMissionDto {
  @IsNumber({}, { message: '정렬 순서는 숫자여야 합니다.' })
  sortOrder: number;
}
