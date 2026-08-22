import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty()
  @IsUUID()
  station_id!: string;

  @ApiProperty({ enum: ['Small', 'Medium', 'Large'] })
  @IsIn(['Small', 'Medium', 'Large'])
  size!: 'Small' | 'Medium' | 'Large';

  @ApiProperty({ description: 'ISO start time, now to 7 days ahead' })
  @Type(() => Date)
  @IsDate()
  start_time!: Date;

  @ApiProperty({ minimum: 1, maximum: 24 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  duration_hours!: number;
}
