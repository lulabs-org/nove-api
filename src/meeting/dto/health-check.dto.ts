import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ description: '状态', example: 'ok' })
  status: string;

  @ApiProperty({ description: '时间戳', example: '2023-12-01T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ description: '服务名', example: 'meeting-service' })
  service: string;
}
