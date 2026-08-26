import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMailConfigDto {
  @ApiProperty({ description: 'SMTP Host', example: 'smtp.gmail.com' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ description: 'SMTP Port', example: 587 })
  @IsInt()
  port: number;

  @ApiProperty({ description: 'Use Secure/SSL', example: false })
  @IsBoolean()
  secure: boolean;

  @ApiProperty({ description: 'SMTP User', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiProperty({ description: 'SMTP Password (will be encrypted)' })
  @IsString()
  @IsOptional()
  pass?: string;

  @ApiProperty({
    description: 'From Email Address',
    example: 'noreply@example.com',
  })
  @IsString()
  @IsNotEmpty()
  from: string;
}
