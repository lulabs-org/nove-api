/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-04 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-04 02:50:20
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/utils/content.utils.ts
 * @Description: 内容处理工具函数
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

export class ContentUtils {
  /**
   * 解码Base64内容
   * @param base64Content Base64编码的内容
   * @returns 解码后的字符串
   * @throws Error 当Base64解码失败时抛出错误
   */
  static decodeBase64Content(base64Content: string): string {
    try {
      return base64Content
        ? Buffer.from(base64Content, 'base64').toString('utf-8')
        : '';
    } catch (error) {
      throw new Error(
        `Base64解码失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
