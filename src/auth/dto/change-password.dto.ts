import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  @MinLength(1, { message: '请输入当前密码' })
  oldPassword: string;

  @ApiProperty({ description: '新密码，至少8位且包含大小写字母和数字' })
  @IsString()
  @MinLength(8, { message: '密码长度至少为8位' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大小写字母和数字',
  })
  newPassword: string;
}
