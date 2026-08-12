import { ApiProperty } from '@nestjs/swagger';

export class PermissionDto {
  @ApiProperty({ description: '权限ID' })
  id: string;

  @ApiProperty({ description: '权限名称' })
  name: string;

  @ApiProperty({ description: '权限编码' })
  code: string;

  @ApiProperty({ description: '权限描述', required: false })
  description: string | null;

  @ApiProperty({ description: '资源标识' })
  resource: string;

  @ApiProperty({ description: '操作类型' })
  action: string;

  @ApiProperty({ description: '权限类型' })
  type: string;
}
