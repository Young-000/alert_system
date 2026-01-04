import {
  IsNotEmpty,
  IsString,
  IsNumber,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsString()
  @IsNotEmpty({ message: '주소는 필수입니다.' })
  address: string;

  @IsNumber()
  @Min(-90, { message: '위도는 -90 이상이어야 합니다.' })
  @Max(90, { message: '위도는 90 이하여야 합니다.' })
  lat: number;

  @IsNumber()
  @Min(-180, { message: '경도는 -180 이상이어야 합니다.' })
  @Max(180, { message: '경도는 180 이하여야 합니다.' })
  lng: number;
}

export class UpdateUserLocationDto {
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty({ message: '위치 정보는 필수입니다.' })
  location: LocationDto;
}
