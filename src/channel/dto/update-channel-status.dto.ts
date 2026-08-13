import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateChannelStatusDto {
  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  isActive: boolean;
}
