/**
 * 规范化国际区号与手机号（国内号码剥离+86/0086）
 * @param phoneNumber 手机号码
 * @param countryCode 国家/地区区号（如 +86, 86, +1 等）
 * @returns 规范化后的完整手机号
 */
export function formatPhoneNumber(
  phoneNumber: string,
  countryCode?: string,
): string {
  const normalizedCountryCode = countryCode?.trim();
  if (
    !normalizedCountryCode ||
    normalizedCountryCode === '+86' ||
    normalizedCountryCode === '86' ||
    normalizedCountryCode === '0086'
  ) {
    return phoneNumber;
  }
  return `${normalizedCountryCode.replace(/^\+/, '')}${phoneNumber}`;
}
