/**
 * Extracts a display name from a platform user object.
 *
 * @param platformUser - The platform user object containing nested user and profile details.
 * @returns A string representing the user's display name, falling back to '未知用户' if not found.
 */
export function extractUserName(platformUser: any): string {
  const pUser = platformUser as {
    displayName?: string;
    user?: {
      username?: string;
      profile?: {
        displayName?: string;
        lastName?: string;
        firstName?: string;
      };
    };
  };

  const user = pUser?.user;
  const profile = user?.profile;
  const result =
    pUser?.displayName ||
    profile?.displayName ||
    user?.username ||
    (profile?.lastName || '') + (profile?.firstName || '');

  return result || '未知用户';
}
