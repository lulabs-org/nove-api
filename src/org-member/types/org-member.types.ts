export interface OrgMemberCreateInput {
  userId: string;
  orgDisplayName?: string;
  employeeNo?: string;
  primaryDeptId?: string;
  title?: string;
  type?: 'INTERNAL' | 'EXTERNAL';
  externalCompany?: string;
}

export interface OrgMemberUpdateInput {
  orgDisplayName?: string;
  employeeNo?: string;
  primaryDeptId?: string;
  title?: string;
  type?: 'INTERNAL' | 'EXTERNAL';
  externalCompany?: string;
  joinedAt?: Date;
}

export interface MemberDepartmentInput {
  departmentIds: string[];
  primaryDeptId?: string;
  append?: boolean;
}

export interface MemberStats {
  total: number;
  active: number;
  suspended: number;
  left: number;
  invited: number;
  internal: number;
  external: number;
}
