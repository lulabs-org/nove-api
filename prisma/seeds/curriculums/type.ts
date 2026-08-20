import { Curriculum, Project } from '@/generated/prisma/client';

export interface CurriculumConfig {
  id: string;
  projectId: string;
  title: string;
  description: string;
  week: number;
  topics: readonly string[];
  goals: readonly string[];
}

export interface CreateCurriculumsParams {
  projects: Project[];
}

export interface CreatedCurriculums {
  curriculums: Curriculum[];
}
