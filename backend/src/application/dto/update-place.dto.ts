import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdatePlaceDto {
  @IsOptional()
  @IsString({ message: '라벨은 문자열이어야 합니다.' })
  @MaxLength(100, { message: '라벨은 100자 이하여야 합니다.' })
  label?: string;

  @IsOptional()
  @IsNumber({}, { message: '위도는 숫자여야 합니다.' })
  @Min(-90, { message: '위도는 -90 이상이어야 합니다.' })
  @Max(90, { message: '위도는 90 이하여야 합니다.' })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: '경도는 숫자여야 합니다.' })
  @Min(-180, { message: '경도는 -180 이상이어야 합니다.' })
  @Max(180, { message: '경도는 180 이하여야 합니다.' })
  longitude?: number;

  @IsOptional()
  @IsString({ message: '주소는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '주소는 500자 이하여야 합니다.' })
  address?: string;

  @IsOptional()
  @IsNumber({}, { message: '반경은 숫자여야 합니다.' })
  @Min(100, { message: '반경은 100m 이상이어야 합니다.' })
  @Max(500, { message: '반경은 500m 이하여야 합니다.' })
  radiusM?: number;
}
