import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpsertPricingDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate_per_hour!: number;
}
