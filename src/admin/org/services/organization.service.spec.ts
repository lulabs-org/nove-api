import { ValidationPipe } from '@nestjs/common';
import { validationPipeOptions } from '@/configs/app.config';
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dto';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationService } from './organization.service';

const existing = {
  id: 'org-1',
  name: 'Acme',
  code: 'LEGACY',
  logo: null,
  description: null,
  parentId: null,
  level: 1,
  sortOrder: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('OrganizationService system-generated codes', () => {
  const repository = {
    create: jest.fn<
      ReturnType<OrganizationRepository['create']>,
      Parameters<OrganizationRepository['create']>
    >(),
    update: jest.fn<
      ReturnType<OrganizationRepository['update']>,
      Parameters<OrganizationRepository['update']>
    >(),
    findById: jest.fn().mockResolvedValue(existing),
  };
  const service = new OrganizationService(
    repository as unknown as OrganizationRepository,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockResolvedValue(existing);
    repository.update.mockResolvedValue(existing);
  });

  it('creates organizations without a caller-supplied code and assigns distinct codes', async () => {
    await service.createOrganization({ name: 'First' });
    await service.createOrganization({ name: 'Second' });
    const [first, second] = repository.create.mock.calls.map(
      ([data]) => data.code,
    );
    expect(first).toMatch(/^ORG_[A-F0-9]{32}$/);
    expect(second).toMatch(/^ORG_[A-F0-9]{32}$/);
    expect(first).not.toBe(second);
  });

  it('preserves legacy codes when updating organization fields', async () => {
    const updated = await service.updateOrganization('org-1', {
      name: 'Renamed',
    });
    expect(repository.update.mock.calls[0][1]).not.toHaveProperty('code');
    expect(updated.code).toBe('LEGACY');
  });

  it('accepts creation with only the required name', async () => {
    const pipe = new ValidationPipe(validationPipeOptions);
    await expect(
      pipe.transform(
        { name: 'Acme' },
        { type: 'body', metatype: CreateOrganizationDto },
      ),
    ).resolves.toMatchObject({ name: 'Acme' });
  });

  it.each([CreateOrganizationDto, UpdateOrganizationDto])(
    'rejects caller-supplied codes in %p',
    async (metatype) => {
      const pipe = new ValidationPipe(validationPipeOptions);
      await expect(
        pipe.transform(
          { name: 'Acme', code: 'MANUAL' },
          { type: 'body', metatype },
        ),
      ).rejects.toThrow();
    },
  );
});
