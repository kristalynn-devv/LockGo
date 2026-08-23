import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateStationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  address!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ enum: ['Open', 'Maintenance', 'Closed'] })
  @IsOptional()
  @IsIn(['Open', 'Maintenance', 'Closed'])
  status?: 'Open' | 'Maintenance' | 'Closed';
}
