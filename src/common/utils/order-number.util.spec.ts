import { encodeOrderNumber, generateOrderCode } from './order-number.util';

describe('order-number.util', () => {
  it('should generate a 19-digit orderCode', () => {
    const code1 = generateOrderCode();
    const code2 = generateOrderCode();

    expect(code1).toHaveLength(19);
    expect(code2).toHaveLength(19);
    expect(code1).not.toEqual(code2);
  });

  it('should encode orderCode into an alphanumeric orderNumber', () => {
    const code = generateOrderCode();
    const encoded = encodeOrderNumber(code);

    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded).toMatch(/^[0-9A-Z]+$/);
  });
});
