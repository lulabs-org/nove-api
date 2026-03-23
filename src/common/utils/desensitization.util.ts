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
}
