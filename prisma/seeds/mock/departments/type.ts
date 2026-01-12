import { Department } from '@prisma/client';

export interface DepartmentConfig {
  code: string;
  name: string;
  description: string;
  level: number;
  sortOrder: number;
  parentCode?: string;
}

export interface CreatedDepartments {
  tech: Department;
  sales: Department;
  finance: Department;
  hr: Department;
  customerService: Department;
  techDev: Department;
  techOps: Department;
  salesDirect: Department;
  salesChannel: Department;
}
