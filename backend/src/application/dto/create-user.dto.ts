import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class CreateUserDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수입니다.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '이름은 필수입니다.' })
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

export class LoginDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  @IsNotEmpty({ message: '이메일은 필수입니다.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
  password: string;
}
