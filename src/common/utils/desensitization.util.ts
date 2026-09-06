/**
 * 数据脱敏工具类
 * 用于敏感信息的脱敏处理
 */

export class DesensitizationUtil {
  /**
   * 手机号脱敏
   * 保留前3位和后4位，中间用 **** 替代
   * @param phone 手机号
   * @returns 脱敏后的手机号
   */
  static maskPhone(phone: string | null | undefined): string | undefined {
    if (!phone) return undefined;

    // 移除所有非数字字符
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length < 7) return phone;

    const prefix = cleaned.slice(0, 3);
    const suffix = cleaned.slice(-4);

    return `${prefix}****${suffix}`;
  }

  /**
   * 邮箱脱敏
   * 保留前2位和@后的域名，中间用 *** 替代
   * @param email 邮箱地址
   * @returns 脱敏后的邮箱
   */
  static maskEmail(email: string | null | undefined): string | undefined {
    if (!email) return undefined;

    const atIndex = email.indexOf('@');
    if (atIndex === -1) return email;

    const prefix = email.slice(0, Math.min(2, atIndex));
    const domain = email.slice(atIndex);

    return `${prefix}***${domain}`;
  }

  /**
   * 姓名脱敏
   * 保留姓氏，名字用 * 替代
   * @param name 姓名
   * @returns 脱敏后的姓名
   */
  static maskName(name: string | null | undefined): string | undefined {
    if (!name) return undefined;

    if (name.length <= 1) return name;

    const firstChar = name.charAt(0);
    const masked = '*'.repeat(name.length - 1);

    return `${firstChar}${masked}`;
  }

  /**
   * 身份证号脱敏
   * 保留前6位和后4位，中间用 ******** 替代
   * @param idCard 身份证号
   * @returns 脱敏后的身份证号
   */
  static maskIdCard(idCard: string | null | undefined): string | undefined {
    if (!idCard) return undefined;

    if (idCard.length < 10) return idCard;

    const prefix = idCard.slice(0, 6);
    const suffix = idCard.slice(-4);

    return `${prefix}********${suffix}`;
  }

  /**
   * 护照号脱敏
   * 保留前2位和后2位，中间用 **** 替代
   * @param passport 护照号
   * @returns 脱敏后的护照号
   */
  static maskPassport(passport: string | null | undefined): string | undefined {
    if (!passport) return undefined;

    const trimmed = passport.trim();
    if (trimmed.length < 5) return passport;

    const prefix = trimmed.slice(0, 2);
    const suffix = trimmed.slice(-2);
    const maskLength = Math.max(trimmed.length - 4, 4);

    return `${prefix}${'*'.repeat(maskLength)}${suffix}`;
  }

  /**
   * 通用证件号脱敏
   * @param documentType 证件类型 (IdentityDocumentType)
   * @param documentNumber 原始证件号码
   * @returns 脱敏后的证件号码
   */
  static maskDocument(
    documentType: string | undefined,
    documentNumber: string | null | undefined,
  ): string | undefined {
    if (!documentNumber) return undefined;

    switch (documentType) {
      case 'ID_CARD':
      case 'HOUSEHOLD_REGISTER':
        return this.maskIdCard(documentNumber);
      case 'PASSPORT':
        return this.maskPassport(documentNumber);
      default: {
        const len = documentNumber.length;
        if (len <= 4) return '****';
        const prefixLen = Math.min(2, Math.floor(len / 4));
        const suffixLen = Math.min(2, Math.floor(len / 4));
        const prefix = documentNumber.slice(0, prefixLen);
        const suffix = documentNumber.slice(-suffixLen);
        return `${prefix}****${suffix}`;
      }
    }
  }
}
