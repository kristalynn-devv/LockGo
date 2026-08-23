import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateCompartmentDto {
  @ApiProperty({ enum: ['Small', 'Medium', 'Large'] })
  @IsIn(['Small', 'Medium', 'Large'])
  size!: 'Small' | 'Medium' | 'Large';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;
}
