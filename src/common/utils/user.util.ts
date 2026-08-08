/**
 * Extracts a display name from a platform user object.
 *
 * @param platformUser - The platform user object containing nested user and profile details.
 * @returns A string representing the user's display name, falling back to '未知用户' if not found.
 */
export function extractUserName(platformUser: any): string {
  const user = platformUser?.user;
  const profile = user?.profile;
  return (
    platformUser?.displayName ||
    profile?.displayName ||
    user?.username ||
    (profile?.lastName || '') + (profile?.firstName || '') ||
    '未知用户'
  );
}
