import { ApiProperty } from '@nestjs/swagger';

export class PermissionsResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名称' })
  name: string;

  @ApiProperty({ description: '用户角色代码' })
  role: string;

  @ApiProperty({ description: '权限列表', type: [String] })
  permissions: string[];
}
