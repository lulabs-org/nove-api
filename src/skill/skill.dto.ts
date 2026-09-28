import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SkillCategory, SkillStatus } from '@/generated/prisma/client';

export class ListSkillsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;

  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;

  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus;
}

export class SkillUploadDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,49}$/)
  @MaxLength(50)
  version!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  changelog?: string;
}
