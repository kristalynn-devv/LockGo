import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const PAYMENT_METHODS = ['promptpay', 'card', 'bank'] as const;

export class PayReservationDto {
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];
}
