import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '@/generated/prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateProductStatusDto {
  @ApiProperty({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  status: ProductStatus;
}
