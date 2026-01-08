import { User, UserProfile } from '@prisma/client';
import { AuthUserResponseDto } from '@/auth/dto/auth-user-response.dto';

export function formatAuthUserResponse(
  user: User & {
    profile: UserProfile | null;
    roles?: Array<{ role: { code: string } }> | null;
  },
): AuthUserResponseDto {
  const name =
    user.profile?.displayName ||
    user.username ||
    user.email ||
    user.phone ||
    '用户';
  const role =
    user.roles && user.roles.length > 0 ? user.roles[0].role.code : 'USER';

  return {
    id: user.id,
    name,
    role,
  };
}
