import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  it('rejects the removed avatar URL field', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      displayName: '测试用户',
      avatar: 'https://external.example/avatar.png',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'avatar' })]),
    );
  });

  it.each(['email', 'phone', 'countryCode'])(
    'rejects the security-managed %s field',
    async (field) => {
      const dto = plainToInstance(UpdateProfileDto, {
        displayName: '测试用户',
        [field]: 'changed-value',
      });

      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ property: field })]),
      );
    },
  );
});
