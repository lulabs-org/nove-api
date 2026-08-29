import { Project, ProjectLevel, ProjectStatus } from '@prisma/client';

export interface ProjectConfig {
  id: string;
  title: string;
  subtitle?: string;
  code?: string;
  slug?: string;
  category?: string;
  image?: string;
  description?: string;
  level?: ProjectLevel;
  duration?: string;
  maxStudents?: number;
  enrolledCount?: number;
  status?: ProjectStatus;
  sortOrder?: number;
  isFeatured?: boolean;
  prerequisites?: readonly string[];
  outcomes?: readonly string[];
  tags?: readonly string[];
}

export interface CreatedProjects {
  projects: Project[];
}
