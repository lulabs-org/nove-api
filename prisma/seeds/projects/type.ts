import { Project } from '@prisma/client';

export interface ProjectConfig {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  image?: string;
  duration?: string;
  level?: string;
  maxStudents?: number;
  description?: string;
  slug?: string;
  prerequisites?: readonly string[];
  outcomes?: readonly string[];
}

export interface CreatedProjects {
  projects: Project[];
}
