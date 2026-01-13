import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import type { User } from '@prisma/client';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = User>(
    err: Error | null,
    user: User | null | undefined,
  ): TUser {
    if (err) throw err;
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    return user as TUser;
  }
}
