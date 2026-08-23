import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListAdminReservationsQuery {
  @ApiPropertyOptional({
    enum: ['Reserved', 'Active', 'Completed', 'Cancelled', 'Expired'],
  })
  @IsOptional()
  @IsIn(['Reserved', 'Active', 'Completed', 'Cancelled', 'Expired'])
  status?: 'Reserved' | 'Active' | 'Completed' | 'Cancelled' | 'Expired';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  station_id?: string;

  @ApiPropertyOptional({
    description: 'ISO timestamp lower bound on start_time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    description: 'ISO timestamp upper bound on start_time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
