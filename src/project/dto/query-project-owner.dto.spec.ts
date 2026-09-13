import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryProjectOwnerDto } from './query-project-owner.dto';

describe('QueryProjectOwnerDto', () => {
  it.each(['', ' ', 'a', ' a '])(
    'rejects an unsafe broad query %p',
    async (keyword) => {
      const input = plainToInstance(QueryProjectOwnerDto, { keyword });

      await expect(validate(input)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'keyword' }),
        ]),
      );
    },
  );

  it('trims and accepts a focused search query', async () => {
    const input = plainToInstance(QueryProjectOwnerDto, {
      keyword: ' 外部负责人 ',
    });

    await expect(validate(input)).resolves.toEqual([]);
    expect(input.keyword).toBe('外部负责人');
  });
});
