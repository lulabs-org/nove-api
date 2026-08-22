import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenerationMethod } from '@prisma/client';

export class CreateMinuteSummaryDto {
  @ApiProperty({ description: '关联的录制ID' })
  @IsString()
  minuteId: string;

  @ApiProperty({ description: '总结内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'AI生成的会议纪要' })
  @IsOptional()
  @IsObject()
  aiMinutes?: any;

  @ApiPropertyOptional({ description: '关键要点' })
  @IsOptional()
  @IsObject()
  keyPoints?: any;

  @ApiPropertyOptional({ description: '行动项' })
  @IsOptional()
  @IsObject()
  actionItems?: any;

  @ApiPropertyOptional({ description: '决策记录' })
  @IsOptional()
  @IsObject()
  decisions?: any;

  @ApiPropertyOptional({ description: '扩展元数据' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateMinuteSummaryDto extends CreateMinuteSummaryDto {}

export class MinuteSummaryDto {
  @ApiProperty({ description: '总结ID' })
  id: string;

  @ApiProperty({ description: '总结内容' })
  content: string;

  @ApiPropertyOptional({ description: 'AI生成的结构化会议纪要' })
  aiMinutes?: any;

  @ApiPropertyOptional({ description: '关键要点' })
  keyPoints?: any;

  @ApiPropertyOptional({ description: '行动项' })
  actionItems?: any;

  @ApiPropertyOptional({ description: '决策记录' })
  decisions?: any;

  @ApiPropertyOptional({ description: '会议金句' })
  goldenQuotes?: any;

  @ApiPropertyOptional({ description: '关键词' })
  keywords?: string[];

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: any;

  @ApiPropertyOptional({ description: '录制ID' })
  minuteId?: string;

  @ApiPropertyOptional({ description: 'AI模型名称或版本' })
  aiModel?: string;

  @ApiPropertyOptional({ description: '生成方式', enum: GenerationMethod })
  generatedBy?: GenerationMethod;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
