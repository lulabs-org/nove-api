import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  it('accepts a cloud drive file as the project image', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      title: '云盘封面项目',
      image: 'drive://file/cm123_project-cover',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects an invalid cloud drive image reference', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      title: '错误封面项目',
      image: 'drive://folder/cm123',
    });

    await expect(validate(dto)).resolves.not.toEqual([]);
  });
});
