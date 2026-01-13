import { Department } from '@prisma/client';

export interface DepartmentConfig {
  code: string;
  name: string;
  description: string;
  level: number;
  sortOrder: number;
  parentCode?: string;
}

export type CreatedDepartments = Department[];
