import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAdminCustomerDto {
  @ApiProperty({ example: 'tester@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  display_name!: string;

  @ApiPropertyOptional({ enum: ['admin'], description: 'Set to grant staff admin access' })
  @IsOptional()
  @IsIn(['admin'])
  staff_role?: 'admin';
}
