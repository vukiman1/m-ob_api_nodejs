import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCityDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class CreateDistrictDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  city: number;
}

export class CreateLocationDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsNumber()
  city: number;

  @IsNotEmpty()
  @IsNumber()
  district: number;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class CreateLocationDto2 {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsNumber()
  city: number;

  @IsNotEmpty()
  @IsNumber()
  district: number;

  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @IsNotEmpty()
  @IsNumber()
  lng: number;
}

export class UploadLocationDto extends PartialType(CreateLocationDto) {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  city?: number;

  @IsOptional()
  @IsNumber()
  district?: number;
}

export class CreateJobLocationDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsNumber()
  city: number;

  @IsNotEmpty()
  @IsNumber()
  district: number;

  @IsNumber({ maxDecimalPlaces: 20 })
  lat: number;

  @IsNumber({ maxDecimalPlaces: 20 })
  lng: number;
}

export class LocationDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsString()
  lat: string;

  @IsString()
  lng: string;

  @IsNotEmpty()
  @IsString()
  cityId: string;

  @IsNotEmpty()
  @IsString()
  districtId: string;
}
