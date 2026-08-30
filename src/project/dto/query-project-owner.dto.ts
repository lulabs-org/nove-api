import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class QueryProjectOwnerDto {
  @ApiProperty({
    description: '搜索姓名、用户名、邮箱或手机号，至少输入 2 个字符',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 100)
  keyword: string;
}
