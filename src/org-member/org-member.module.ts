import { Module } from '@nestjs/common';
import { OrgMemberController } from './controllers/org-member.controller';
import { OrgMemberService } from './services/org-member.service';
import { OrgMemberRepository } from './repositories/org-member.repository';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [OrgMemberController],
  providers: [OrgMemberService, OrgMemberRepository, PrismaService],
  exports: [OrgMemberService, OrgMemberRepository],
})
export class OrgMemberModule {}
