import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UnfreezeOrderDto {
  @ApiPropertyOptional({
    description: '解冻原因或处理备注',
    example: '学员申请恢复学习，到期时间顺延',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
