import { FormatUtils } from './format.utils';

describe('FormatUtils', () => {
  describe('formatTimestamp', () => {
    it('should format timestamp correctly', () => {
      expect(FormatUtils.formatTimestamp(0)).toBe('00:00:00');
      expect(FormatUtils.formatTimestamp(1000)).toBe('00:00:01');
      expect(FormatUtils.formatTimestamp(60000)).toBe('00:01:00');
      expect(FormatUtils.formatTimestamp(3600000)).toBe('01:00:00');
      expect(FormatUtils.formatTimestamp(3661000)).toBe('01:01:01');
      expect(FormatUtils.formatTimestamp(86399000)).toBe('23:59:59');
    });

    it('should throw error for negative timestamp', () => {
      expect(() => FormatUtils.formatTimestamp(-1)).toThrow(
        'Invalid timestamp: must be a non-negative number',
      );
    });

    it('should throw error for NaN', () => {
      expect(() => FormatUtils.formatTimestamp(NaN)).toThrow(
        'Invalid timestamp: must be a non-negative number',
      );
    });

    it('should throw error for Infinity', () => {
      expect(() => FormatUtils.formatTimestamp(Infinity)).toThrow(
        'Invalid timestamp: must be a non-negative number',
      );
    });

    it('should throw error for -Infinity', () => {
      expect(() => FormatUtils.formatTimestamp(-Infinity)).toThrow(
        'Invalid timestamp: must be a non-negative number',
      );
    });
  });
});
