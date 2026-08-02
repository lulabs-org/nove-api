import { ApiProperty } from '@nestjs/swagger';
import { OrgMemberDetailDto } from './org-member.dto';

export class AddMemberResponseDto {
  @ApiProperty({
    description: '成员详情',
    type: OrgMemberDetailDto,
  })
  member: OrgMemberDetailDto;

  @ApiProperty({
    description: '邮件是否发送成功',
    example: true,
  })
  emailSent: boolean;
}
