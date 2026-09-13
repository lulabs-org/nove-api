import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@/generated/prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateProjectStatusDto {
  @ApiProperty({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;
}
