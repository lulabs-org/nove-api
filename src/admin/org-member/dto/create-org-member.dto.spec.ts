import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrgMemberDto } from './create-org-member.dto';

describe('CreateOrgMemberDto', () => {
  it('requires at least an email or a phone', async () => {
    const errors = await validate(plainToInstance(CreateOrgMemberDto, {}));

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'phone']),
    );
  });

  it('requires a country code when a phone is supplied', async () => {
    const errors = await validate(
      plainToInstance(CreateOrgMemberDto, { phone: '13800138000' }),
    );

    expect(errors.map((error) => error.property)).toContain('countryCode');
  });

  it('normalizes and accepts a valid email', async () => {
    const dto = plainToInstance(CreateOrgMemberDto, {
      email: ' Test@Example.COM ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.email).toBe('test@example.com');
  });

  it('accepts a valid phone and country code', async () => {
    const errors = await validate(
      plainToInstance(CreateOrgMemberDto, {
        countryCode: '+86',
        phone: '138 0013 8000',
      }),
    );

    expect(errors).toHaveLength(0);
  });
});
