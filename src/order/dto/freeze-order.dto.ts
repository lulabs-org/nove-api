import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FreezeOrderDto {
  @ApiPropertyOptional({
    description: '冻结原因或业务备注（如学员病假、备考暂缓等）',
    example: '学员因个人原因申请暂停权益30天',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
