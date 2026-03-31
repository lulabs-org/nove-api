import { ApiProperty } from '@nestjs/swagger';

export class DepartmentAncestorDto {
  @ApiProperty({
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '部门名称',
    example: '技术部',
  })
  name: string;

  @ApiProperty({
    description: '部门编码',
    example: 'TECH',
  })
  code: string;

  @ApiProperty({
    description: '层级',
    example: 1,
  })
  level: number;
}

export class DepartmentAncestorsResponse {
  @ApiProperty({
    description: '祖先链（从根到父节点）',
    type: [DepartmentAncestorDto],
  })
  items: DepartmentAncestorDto[];
}
