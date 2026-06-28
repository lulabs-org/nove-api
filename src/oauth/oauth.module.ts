import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { OAuthController } from './controllers/oauth.controller';
import { OAuthClientService } from './services/oauth-client.service';
import { OAuthGrantService } from './services/oauth-grant.service';
import { jwtConfig } from '@/configs/jwt.config';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      useFactory: (cfg: ReturnType<typeof jwtConfig>) => ({
        secret: cfg.accessSecret,
        signOptions: {
          expiresIn: cfg.accessExpiresIn,
        },
      }),
      inject: [jwtConfig.KEY],
    }),
  ],
  controllers: [OAuthController],
  providers: [OAuthClientService, OAuthGrantService],
  exports: [OAuthClientService, OAuthGrantService],
})
export class OAuthModule {}
