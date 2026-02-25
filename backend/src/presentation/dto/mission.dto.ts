import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  MaxLength,
} from 'class-validator';

const MISSION_TYPES = ['commute', 'return'] as const;

export class CreateMissionDto {
  @IsString()
  @IsNotEmpty({ message: '미션 제목은 필수입니다.' })
  @MaxLength(100, { message: '미션 제목은 100자 이내여야 합니다.' })
  title: string;

  @IsIn(MISSION_TYPES, { message: '미션 타입은 commute 또는 return이어야 합니다.' })
  missionType: 'commute' | 'return';
}

export class UpdateMissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '미션 제목은 100자 이내여야 합니다.' })
  title?: string;

  @IsOptional()
  @IsIn(MISSION_TYPES, { message: '미션 타입은 commute 또는 return이어야 합니다.' })
  missionType?: 'commute' | 'return';
}

export class ReorderMissionDto {
  @IsNumber({}, { message: '정렬 순서는 숫자여야 합니다.' })
  sortOrder: number;
}
