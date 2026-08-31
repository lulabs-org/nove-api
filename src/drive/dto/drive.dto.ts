import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  DriveAction,
  DriveGrantEffect,
  DrivePrincipalType,
} from '@prisma/client';

export class ListDriveNodesQueryDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class CreateDriveFolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  spaceId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

export class UpdateDriveNodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inheritAcl?: boolean;
}

export class MoveDriveNodeDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class CreateUploadSessionDto {
  @ApiProperty()
  @IsString()
  spaceId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({ type: String, description: '字节数，使用十进制字符串' })
  @Transform(({ value }) => String(value))
  @IsString()
  sizeBytes: string;

  @ApiPropertyOptional({
    description: '文件完整内容的 SHA-256，小写十六进制；云扫描文件必填',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  checksumSha256?: string;
}

export class SignUploadPartsDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10000, { each: true })
  partNumbers: number[];
}

export class CompletedUploadPartDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(10000)
  number: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  etag: string;
}

export class CompleteUploadSessionDto {
  @ApiProperty({ type: [CompletedUploadPartDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => CompletedUploadPartDto)
  parts: CompletedUploadPartDto[];
}

export class PutDriveGrantDto {
  @ApiProperty({ enum: DrivePrincipalType })
  @IsEnum(DrivePrincipalType)
  principalType: DrivePrincipalType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  principalId: string;

  @ApiProperty({ enum: DriveGrantEffect })
  @IsEnum(DriveGrantEffect)
  effect: DriveGrantEffect;

  @ApiProperty({ enum: DriveAction, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DriveAction, { each: true })
  actions: DriveAction[];
}

export class DriveSpaceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional({ nullable: true })
  orgId: string | null;
}

export class DriveNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  spaceId: string;

  @ApiPropertyOptional({ nullable: true })
  parentId: string | null;

  @ApiProperty()
  type: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  inheritAcl: boolean;

  @ApiPropertyOptional({ nullable: true })
  fileId: string | null;

  @ApiPropertyOptional({ nullable: true })
  contentType: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  sizeBytes: string | null;

  @ApiPropertyOptional({ nullable: true })
  fileStatus: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
