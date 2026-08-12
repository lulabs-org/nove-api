import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  @IsBoolean()
  active: boolean;
}
