import { ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { UpdateOrganizationDto } from '@/admin/org/dto';

export class OrganizationProfileDto extends PickType(UpdateOrganizationDto, [
  'name',
  'description',
] as const) {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ enum: ['keep', 'remove'] })
  @IsOptional()
  @IsIn(['keep', 'remove'])
  logoAction?: 'keep' | 'remove';
}
