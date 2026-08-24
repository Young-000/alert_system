import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MISSION_TYPES = ['commute', 'return'] as const;

// 이모지 하나는 ZWJ·변이 선택자 조합으로 여러 코드유닛이 될 수 있다.
const MAX_EMOJI_LENGTH = 16;

/**
 * 제목은 검증 전에 잘라낸다.
 *
 * `IsNotEmpty`는 `''`만 막고 `'   '`는 통과시킨다. 그대로 두면 도메인 엔티티가
 * trim 후 길이 0을 보고 예외를 던지고, 전역 필터가 그것을 **500 Internal server error**로
 * 바꾼다 — 사용자는 사유를 못 받고 정상적인 입력 오류가 장애 로그에 스택으로 쌓인다.
 */
const TrimTitle = (): PropertyDecorator =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateMissionDto {
  @IsString()
  @IsNotEmpty({ message: '미션 제목은 필수입니다.' })
  @MaxLength(100, { message: '미션 제목은 100자 이내여야 합니다.' })
  @TrimTitle()
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
  @IsNotEmpty({ message: '미션 제목은 필수입니다.' })
  @MaxLength(100, { message: '미션 제목은 100자 이내여야 합니다.' })
  @TrimTitle()
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_EMOJI_LENGTH, { message: '이모지 형식이 올바르지 않습니다.' })
  emoji?: string;

  @IsOptional()
  @IsIn(MISSION_TYPES, { message: '미션 타입은 commute 또는 return이어야 합니다.' })
  missionType?: 'commute' | 'return';
}

/**
 * `sort_order`는 Postgres INTEGER(int4) 컬럼이다
 * (`20260803_add_mission_challenge_cache_tables.sql:38`).
 *
 * `@IsNumber()`만으로는 소수도 int4 밖의 값도 통과한다. 통과한 값은 그대로 UPDATE에 실려
 * 두 가지로 갈라진다:
 *
 * - `1e15` 같은 범위 밖 값 → Postgres가 "integer out of range"로 거부해 **500**이 된다.
 * - `2147483647`(경계값)은 저장에 성공하지만, 다음 미션 생성이 마지막 sort_order + 1을
 *   쓰므로(`manage-mission.use-case.ts:61-64`) **그때부터 그 유형의 미션 생성이 계속 실패한다.**
 *   한 번의 요청이 사용자 계정에 남는 고장을 만든다.
 * - `1.5`는 Postgres가 2로 반올림해 기존 미션과 자리가 겹친다 — 목록 순서가 비결정적이 된다.
 *
 * 그래서 상한을 "다음 값까지 계산해도 int4 안에 남는" 범위로 잡는다.
 * 클라이언트는 서버가 준 sort_order끼리 맞바꿀 뿐이라(`MissionSettingsPage.tsx:382-383`)
 * 정상 사용에서 이 상한에 닿지 않는다.
 */
const MAX_SORT_ORDER = 2_147_483_646;

export class ReorderMissionDto {
  @IsInt({ message: '정렬 순서는 정수여야 합니다.' })
  @Min(0, { message: '정렬 순서는 0 이상이어야 합니다.' })
  @Max(MAX_SORT_ORDER, { message: '정렬 순서가 허용 범위를 벗어났습니다.' })
  sortOrder: number;
}
