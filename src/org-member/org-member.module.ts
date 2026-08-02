import { Module } from '@nestjs/common';
import { OrgMemberController } from './controllers/org-member.controller';
import { OrgMemberService } from './services/org-member.service';
import { OrgMemberRepository } from './repositories/org-member.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserModule } from '@/user/user.module';
import { MailModule } from '@/mail/mail.module';
import { OrganizationModule } from '@/org/organization.module';

@Module({
  imports: [PrismaModule, UserModule, MailModule, OrganizationModule],
  controllers: [OrgMemberController],
  providers: [OrgMemberService, OrgMemberRepository],
  exports: [OrgMemberService, OrgMemberRepository],
})
export class OrgMemberModule {}
