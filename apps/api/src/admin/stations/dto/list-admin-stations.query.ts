import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ListAdminStationsQuery {
  @ApiPropertyOptional({ enum: ['Open', 'Maintenance', 'Closed'] })
  @IsOptional()
  @IsIn(['Open', 'Maintenance', 'Closed'])
  status?: 'Open' | 'Maintenance' | 'Closed';

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
