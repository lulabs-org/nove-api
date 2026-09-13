import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

describe('product media references', () => {
  it.each(['drive://file/file-1', 'https://example.com/media.mp4'])(
    'accepts %s',
    async (value) => {
      const dto = plainToInstance(CreateProductDto, {
        productCode: 'PROD-1',
        name: '产品',
        category: 'COURSE',
        imageUrl: value,
        videoUrl: value,
      });
      expect(
        (await validate(dto)).filter((error) =>
          ['imageUrl', 'videoUrl'].includes(error.property),
        ),
      ).toHaveLength(0);
    },
  );
  it.each([
    'drive://file/',
    'javascript:alert(1)',
    'drive://file/file?token=bad',
  ])('rejects %s', async (value) => {
    const dto = plainToInstance(CreateProductDto, {
      imageUrl: value,
      videoUrl: value,
    });
    expect(
      (await validate(dto)).filter((error) =>
        ['imageUrl', 'videoUrl'].includes(error.property),
      ),
    ).toHaveLength(2);
  });
});
