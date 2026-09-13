import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO31661Alpha3,
  IsISO8601,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  DocumentVerifyStatus,
  IdentityDocumentType,
} from '@/generated/prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateIdentityDocumentDto {
  @ApiProperty({ enum: IdentityDocumentType })
  @IsEnum(IdentityDocumentType)
  documentType: IdentityDocumentType;

  @ApiProperty({ default: 'CHN' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsISO31661Alpha3()
  issuingCountry = 'CHN';

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  holderName: string;

  @ApiProperty({ description: '证件号码；仅用于加密写入，不会在响应中返回' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  documentNumber: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsISO8601({ strict: true })
  issueDate?: string;

  @ApiPropertyOptional({ format: 'date' })
  @ValidateIf((value: CreateIdentityDocumentDto) => !value.isPermanent)
  @IsOptional()
  @IsISO8601({ strict: true })
  expiryDate?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  issuingAuthority?: string | null;

  @ApiPropertyOptional({ description: '云盘 DriveFile ID' })
  @IsOptional()
  @IsString()
  frontDriveFileId?: string | null;

  @ApiPropertyOptional({ description: '云盘 DriveFile ID' })
  @IsOptional()
  @IsString()
  backDriveFileId?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateIdentityDocumentDto extends PartialType(
  CreateIdentityDocumentDto,
) {}

export class ReviewIdentityDocumentDto {
  @ApiProperty({
    enum: [DocumentVerifyStatus.VERIFIED, DocumentVerifyStatus.REJECTED],
  })
  @IsIn([DocumentVerifyStatus.VERIFIED, DocumentVerifyStatus.REJECTED])
  status: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional()
  @ValidateIf(
    (value: ReviewIdentityDocumentDto) =>
      value.status === DocumentVerifyStatus.REJECTED,
  )
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  rejectReason?: string;
}

export class IdentityDocumentFileDto {
  @ApiProperty()
  driveFileId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  contentType: string;
}

export class IdentityDocumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: IdentityDocumentType })
  documentType: IdentityDocumentType;

  @ApiProperty()
  issuingCountry: string;

  @ApiProperty()
  holderName: string;

  @ApiProperty()
  maskedNumber: string;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  issueDate: Date | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  expiryDate: Date | null;

  @ApiProperty()
  isPermanent: boolean;

  @ApiPropertyOptional({ nullable: true })
  issuingAuthority: string | null;

  @ApiPropertyOptional({ type: IdentityDocumentFileDto, nullable: true })
  frontFile: IdentityDocumentFileDto | null;

  @ApiPropertyOptional({ type: IdentityDocumentFileDto, nullable: true })
  backFile: IdentityDocumentFileDto | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata: unknown;

  @ApiProperty({ enum: DocumentVerifyStatus })
  status: DocumentVerifyStatus;

  @ApiPropertyOptional({ nullable: true })
  rejectReason: string | null;

  @ApiPropertyOptional({ nullable: true })
  verifiedAt: Date | null;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
