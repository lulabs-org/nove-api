import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ChannelController } from './controllers/channel.controller';
import { ChannelRepository } from './repositories/channel.repository';
import { ChannelService } from './services/channel.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChannelController],
  providers: [ChannelService, ChannelRepository],
  exports: [ChannelService, ChannelRepository],
})
export class ChannelModule {}
