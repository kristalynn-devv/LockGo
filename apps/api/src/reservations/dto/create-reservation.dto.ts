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
  @IsUUID()
  station_id!: string;

  @IsIn(['Small', 'Medium', 'Large'])
  size!: 'Small' | 'Medium' | 'Large';

  @Type(() => Date)
  @IsDate()
  start_time!: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  duration_hours!: number;
}
