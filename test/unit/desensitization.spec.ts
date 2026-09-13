import { DesensitizationUtil } from '@/common/utils/desensitization.util';

describe('DesensitizationUtil', () => {
  describe('maskPhone', () => {
    it('should mask standard 11-digit phone numbers', () => {
      expect(DesensitizationUtil.maskPhone('13812345678')).toBe('138****5678');
    });

    it('should handle undefined or null', () => {
      expect(DesensitizationUtil.maskPhone(undefined)).toBeUndefined();
      expect(DesensitizationUtil.maskPhone(null)).toBeUndefined();
    });
  });

  describe('maskEmail', () => {
    it('should mask standard email', () => {
      expect(DesensitizationUtil.maskEmail('testuser@example.com')).toBe(
        'te***@example.com',
      );
    });
  });

  describe('maskIdCard', () => {
    it('should mask 18-digit ID card number', () => {
      expect(DesensitizationUtil.maskIdCard('110101199003072345')).toBe(
        '110101********2345',
      );
    });
  });

  describe('maskPassport', () => {
    it('should mask passport number', () => {
      expect(DesensitizationUtil.maskPassport('E12345678')).toBe('E1*****78');
      expect(DesensitizationUtil.maskPassport('G98765432')).toBe('G9*****32');
    });

    it('should return short string as is if length < 5', () => {
      expect(DesensitizationUtil.maskPassport('AB12')).toBe('AB12');
    });
  });

  describe('maskDocument', () => {
    it('should mask correctly based on documentType', () => {
      expect(
        DesensitizationUtil.maskDocument('ID_CARD', '110101199003072345'),
      ).toBe('110101********2345');
      expect(
        DesensitizationUtil.maskDocument(
          'HOUSEHOLD_REGISTER',
          '110101199003072345',
        ),
      ).toBe('110101********2345');
      expect(DesensitizationUtil.maskDocument('PASSPORT', 'E12345678')).toBe(
        'E1*****78',
      );
      expect(DesensitizationUtil.maskDocument('OTHER', 'HK9876543210')).toBe(
        'HK****10',
      );
    });
  });
});
