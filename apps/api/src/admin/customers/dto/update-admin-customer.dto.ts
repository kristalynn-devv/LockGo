import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAdminCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  display_name?: string;

  @ApiPropertyOptional({ enum: ['active', 'disabled'] })
  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @ApiPropertyOptional({
    enum: ['admin', 'none'],
    description: 'admin = promote to staff; none = remove staff row',
  })
  @IsOptional()
  @IsIn(['admin', 'none'])
  staff_role?: 'admin' | 'none';
}
