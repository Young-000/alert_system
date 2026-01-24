import { IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class LocationQueryDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => parseFloat(value))
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => parseFloat(value))
  lng: number;
}
