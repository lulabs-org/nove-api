import { Curriculum, CurriculumStatus, Project } from '@prisma/client';

export interface CurriculumConfig {
  id: string;
  projectId: string;
  title: string;
  subtitle?: string;
  description: string;
  week: number;
  sortOrder?: number;
  status?: CurriculumStatus;
  topics?: readonly string[];
  goals?: readonly string[];
  deliverables?: readonly string[];
  resources?: readonly string[];
}

export interface CreateCurriculumsParams {
  projects: Project[];
}

export interface CreatedCurriculums {
  curriculums: Curriculum[];
}
