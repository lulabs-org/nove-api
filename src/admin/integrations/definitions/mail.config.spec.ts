import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateMailConfigDto } from './mail.config';

describe('UpdateMailConfigDto', () => {
  it('allows clearing a configured brand logo', async () => {
    const dto = plainToInstance(UpdateMailConfigDto, { brandLogoUrl: '' });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('continues to reject invalid legacy logo URLs', async () => {
    const dto = plainToInstance(UpdateMailConfigDto, {
      brandLogoUrl: 'not a url',
    });

    await expect(validate(dto)).resolves.not.toEqual([]);
  });
});
