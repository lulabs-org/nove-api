/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-04 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-04 02:51:33
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/utils/content.utils.spec.ts
 * @Description: 内容处理工具函数测试
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ContentUtils } from './content.utils';

describe('ContentUtils', () => {
  describe('decodeBase64Content', () => {
    it('should decode valid Base64 string correctly', () => {
      const base64String = Buffer.from('Hello World', 'utf-8').toString(
        'base64',
      );
      const result = ContentUtils.decodeBase64Content(base64String);
      expect(result).toBe('Hello World');
    });

    it('should decode Chinese characters correctly', () => {
      const base64String = Buffer.from('你好世界', 'utf-8').toString('base64');
      const result = ContentUtils.decodeBase64Content(base64String);
      expect(result).toBe('你好世界');
    });

    it('should return empty string for empty input', () => {
      const result = ContentUtils.decodeBase64Content('');
      expect(result).toBe('');
    });

    it('should return empty string for falsy input', () => {
      const result = ContentUtils.decodeBase64Content('');
      expect(result).toBe('');
    });

    it('should decode multi-line text correctly', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const base64String = Buffer.from(text, 'utf-8').toString('base64');
      const result = ContentUtils.decodeBase64Content(base64String);
      expect(result).toBe(text);
    });

    it('should decode special characters correctly', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const base64String = Buffer.from(text, 'utf-8').toString('base64');
      const result = ContentUtils.decodeBase64Content(base64String);
      expect(result).toBe(text);
    });

    it('should decode JSON string correctly', () => {
      const json = '{"key":"value","number":123}';
      const base64String = Buffer.from(json, 'utf-8').toString('base64');
      const result = ContentUtils.decodeBase64Content(base64String);
      expect(result).toBe(json);
    });

    it('should decode emoji correctly', () => {
      const text = '😀🎉🚀';
      const base64String = Buffer.from(text, 'utf-8').toString('base64');
      const result = ContentUtils.decodeBase64Content(base64String);
      expect(result).toBe(text);
    });

    it('should handle long Base64 strings', () => {
      const longText = 'a'.repeat(1000);
      const base64String = Buffer.from(longText, 'utf-8').toString('base64');
      const result = ContentUtils.decodeBase64Content(base64String);
      expect(result).toBe(longText);
    });
  });
});
