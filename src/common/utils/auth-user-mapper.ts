import { User, UserProfile } from '@prisma/client';
import { AuthUserResponseDto } from '@/auth/dto/auth-user-response.dto';

export function formatAuthUserResponse(
  user: User & {
    profile: UserProfile | null;
  },
): AuthUserResponseDto {
  const name =
    user.profile?.displayName ||
    user.username ||
    user.email ||
    user.phone ||
    '用户';

  return {
    id: user.id,
    name,
  };
}
