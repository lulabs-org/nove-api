import { formatPhoneNumber } from './phone.util';

describe('phone.util', () => {
  describe('formatPhoneNumber', () => {
    it('returns raw phone number when country code is missing or Chinese mainland', () => {
      expect(formatPhoneNumber('13800138000')).toBe('13800138000');
      expect(formatPhoneNumber('13800138000', '+86')).toBe('13800138000');
      expect(formatPhoneNumber('13800138000', '86')).toBe('13800138000');
      expect(formatPhoneNumber('13800138000', '0086')).toBe('13800138000');
    });

    it('prepends country code without plus sign for international numbers', () => {
      expect(formatPhoneNumber('987654321', '+852')).toBe('852987654321');
      expect(formatPhoneNumber('2025550123', '+1')).toBe('12025550123');
    });
  });
});
