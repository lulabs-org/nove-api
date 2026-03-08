import { createHash } from 'crypto';
import { verifySignature } from '../index';

describe('TencentCryptoService', () => {
  describe('verifySignature', () => {
    const token = 'test_token';
    const timestamp = '1234567890';
    const nonce = 'random_nonce';
    const data = 'test_data';

    // 计算正确的签名用于测试
    const generateValidSignature = (
      token: string,
      timestamp: string,
      nonce: string,
      data: string,
    ): string => {
      const arr = [token, timestamp, nonce, data].sort();
      const str = arr.join('');
      const sha1 = createHash('sha1');
      return sha1.update(str).digest('hex');
    };

    it('should return true for valid signature', () => {
      const validSignature = generateValidSignature(
        token,
        timestamp,
        nonce,
        data,
      );
      const result = verifySignature(
        token,
        timestamp,
        nonce,
        data,
        validSignature,
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const invalidSignature = 'invalid_signature_hash';
      const result = verifySignature(
        token,
        timestamp,
        nonce,
        data,
        invalidSignature,
      );
      expect(result).toBe(false);
    });

    it('should return false for empty signature', () => {
      const result = verifySignature(token, timestamp, nonce, data, '');
      expect(result).toBe(false);
    });

    it('should return false when signature is modified', () => {
      const validSignature = generateValidSignature(
        token,
        timestamp,
        nonce,
        data,
      );
      const modifiedSignature = validSignature.slice(0, -1) + 'x'; // 修改最后一个字符
      const result = verifySignature(
        token,
        timestamp,
        nonce,
        data,
        modifiedSignature,
      );
      expect(result).toBe(false);
    });

    it('should handle different parameter orders correctly (dictionary sort)', () => {
      // 测试参数字典序排序是否正确
      const token1 = 'z_token';
      const timestamp1 = 'a_timestamp';
      const nonce1 = 'm_nonce';
      const data1 = 'b_data';

      const validSignature = generateValidSignature(
        token1,
        timestamp1,
        nonce1,
        data1,
      );
      const result = verifySignature(
        token1,
        timestamp1,
        nonce1,
        data1,
        validSignature,
      );
      expect(result).toBe(true);
    });

    it('should handle empty parameters', () => {
      const emptyToken = '';
      const emptyTimestamp = '';
      const emptyNonce = '';
      const emptyData = '';

      const validSignature = generateValidSignature(
        emptyToken,
        emptyTimestamp,
        emptyNonce,
        emptyData,
      );
      const result = verifySignature(
        emptyToken,
        emptyTimestamp,
        emptyNonce,
        emptyData,
        validSignature,
      );
      expect(result).toBe(true);
    });

    it('should handle special characters in parameters', () => {
      const specialToken = 'token@#$%';
      const specialTimestamp = '时间戳123';
      const specialNonce = 'nonce!@#';
      const specialData = 'data with spaces & symbols';

      const validSignature = generateValidSignature(
        specialToken,
        specialTimestamp,
        specialNonce,
        specialData,
      );
      const result = verifySignature(
        specialToken,
        specialTimestamp,
        specialNonce,
        specialData,
        validSignature,
      );
      expect(result).toBe(true);
    });

    it('should be case sensitive', () => {
      const validSignature = generateValidSignature(
        token,
        timestamp,
        nonce,
        data,
      );
      const upperCaseSignature = validSignature.toUpperCase();
      const result = verifySignature(
        token,
        timestamp,
        nonce,
        data,
        upperCaseSignature,
      );
      expect(result).toBe(false);
    });

    it('should produce consistent results for same input', () => {
      const signature1 = generateValidSignature(token, timestamp, nonce, data);
      const signature2 = generateValidSignature(token, timestamp, nonce, data);
      expect(signature1).toBe(signature2);

      const result1 = verifySignature(
        token,
        timestamp,
        nonce,
        data,
        signature1,
      );
      const result2 = verifySignature(
        token,
        timestamp,
        nonce,
        data,
        signature2,
      );
      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });

    it('should fail when any parameter is changed', () => {
      const validSignature = generateValidSignature(
        token,
        timestamp,
        nonce,
        data,
      );

      // 改变token
      expect(
        verifySignature(
          'different_token',
          timestamp,
          nonce,
          data,
          validSignature,
        ),
      ).toBe(false);

      // 改变timestamp
      expect(
        verifySignature(token, '9876543210', nonce, data, validSignature),
      ).toBe(false);

      // 改变nonce
      expect(
        verifySignature(
          token,
          timestamp,
          'different_nonce',
          data,
          validSignature,
        ),
      ).toBe(false);

      // 改变data
      expect(
        verifySignature(
          token,
          timestamp,
          nonce,
          'different_data',
          validSignature,
        ),
      ).toBe(false);
    });
  });
});
