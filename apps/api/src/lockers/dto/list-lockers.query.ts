import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListLockersQuery {
  @ApiPropertyOptional({
    description: 'Mock location id or free text (si-lom, siam, asok, mo-chit, on-nut)',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Max distance in km from the origin' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiPropertyOptional({ enum: ['Small', 'Medium', 'Large'] })
  @IsOptional()
  @IsIn(['Small', 'Medium', 'Large'])
  size?: 'Small' | 'Medium' | 'Large';

  @ApiPropertyOptional({ description: 'Max starting price in THB' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Keep stations that have a free compartment' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  available_only?: boolean;

  @ApiPropertyOptional({ description: 'ISO start time when checking a booking window' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_time?: Date;

  @ApiPropertyOptional({ minimum: 1, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(24)
  duration?: number;
}
