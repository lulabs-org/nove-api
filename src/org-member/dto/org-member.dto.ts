import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberType, MemberStatus } from '@prisma/client';

export class OrgMemberDto {
  @ApiProperty({
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '组织 ID',
    example: 'clx0987654321fedcba',
  })
  orgId: string;

  @ApiProperty({
    description: '用户 ID',
    example: 'clx1111111111111111',
  })
  userId: string;

  @ApiProperty({
    description: '成员类型',
    enum: MemberType,
    example: MemberType.INTERNAL,
  })
  type: MemberType;

  @ApiProperty({
    description: '成员状态',
    enum: MemberStatus,
    example: MemberStatus.ACTIVE,
  })
  status: MemberStatus;

  @ApiPropertyOptional({
    description: '组织显示名称',
    example: '张三',
    nullable: true,
  })
  orgDisplayName: string | null;

  @ApiPropertyOptional({
    description: '内部员工工号',
    example: 'EMP001',
    nullable: true,
  })
  employeeNo: string | null;

  @ApiPropertyOptional({
    description: '主要部门 ID',
    example: 'clx2222222222222222',
    nullable: true,
  })
  primaryDeptId: string | null;

  @ApiPropertyOptional({
    description: '外部公司名称',
    example: '某某供应商',
    nullable: true,
  })
  externalCompany: string | null;

  @ApiPropertyOptional({
    description: '职位/头衔',
    example: '软件工程师',
    nullable: true,
  })
  title: string | null;

  @ApiProperty({
    description: '加入时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  joinedAt: Date;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '删除时间',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  deletedAt: Date | null;
}

export class OrgMemberUserInfo {
  @ApiProperty({
    description: '用户 ID',
    example: 'clx1111111111111111',
  })
  id: string;

  @ApiPropertyOptional({
    description: '用户名',
    example: 'john_doe',
    nullable: true,
  })
  username: string | null;

  @ApiPropertyOptional({
    description: '邮箱',
    example: 'john@example.com',
    nullable: true,
  })
  email: string | null;

  @ApiPropertyOptional({
    description: '用户资料',
    nullable: true,
  })
  profile?:
    | {
        displayName: string | null;
        avatar: string | null;
      }
    | null
    | undefined;
}

export class OrgMemberDepartmentInfo {
  @ApiProperty({
    description: '部门 ID',
    example: 'clx2222222222222222',
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
    description: '是否主要部门',
    example: true,
  })
  isPrimary: boolean;
}

export class OrgMemberRoleInfo {
  @ApiProperty({
    description: '角色 ID',
    example: 'clx3333333333333333',
  })
  id: string;

  @ApiProperty({
    description: '角色名称',
    example: '管理员',
  })
  name: string;

  @ApiProperty({
    description: '角色编码',
    example: 'ADMIN',
  })
  code: string;
}

export class OrgMemberDetailDto extends OrgMemberDto {
  @ApiProperty({
    description: '用户信息',
    type: OrgMemberUserInfo,
  })
  user: OrgMemberUserInfo;

  @ApiPropertyOptional({
    description: '主要部门信息',
    nullable: true,
  })
  primaryDept?: {
    id: string;
    name: string;
    code: string;
  };

  @ApiProperty({
    description: '部门列表',
    type: [OrgMemberDepartmentInfo],
  })
  departments: OrgMemberDepartmentInfo[];

  @ApiProperty({
    description: '角色列表',
    type: [OrgMemberRoleInfo],
  })
  roles: OrgMemberRoleInfo[];
}

export class OrgMemberListResponse {
  @ApiProperty({
    description: '成员列表',
    type: [OrgMemberDto],
  })
  items: OrgMemberDto[];

  @ApiProperty({
    description: '总数',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: '总页数',
    example: 5,
  })
  totalPages: number;
}

export class BatchImportFailure {
  @ApiProperty({
    description: '用户 ID',
    example: 'clx1234567890abcdef',
  })
  userId: string;

  @ApiProperty({
    description: '失败原因',
    example: 'User is already a member of this organization',
  })
  reason: string;
}

export class BatchImportResponse {
  @ApiProperty({
    description: '成功导入的成员数量',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: '失败的成员数量',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: '失败的成员列表',
    type: [BatchImportFailure],
  })
  failures: BatchImportFailure[];
}
