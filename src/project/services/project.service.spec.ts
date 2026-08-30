/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus, ProjectLevel, ProjectStatus } from '@prisma/client';
import { ProjectRepository } from '../repositories/project.repository';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let repository: jest.Mocked<ProjectRepository>;

  const now = new Date('2026-08-30T00:00:00.000Z');
  const project = (overrides: Record<string, unknown> = {}) => ({
    id: 'project-1',
    orgId: 'org-1',
    title: 'Project One',
    subtitle: null,
    code: 'PRJ-001',
    slug: 'project-one',
    category: 'Web',
    image: null,
    description: null,
    level: ProjectLevel.BEGINNER,
    duration: null,
    maxStudents: 20,
    _count: { members: 10 },
    prerequisites: ['TypeScript'],
    outcomes: ['A working app'],
    tags: ['Web'],
    productId: 'product-1',
    status: ProjectStatus.DRAFT,
    sortOrder: 0,
    isFeatured: false,
    startDate: null,
    endDate: null,
    enrollDeadline: null,
    publishedAt: null,
    ownerId: 'user-1',
    createdById: 'user-1',
    updatedById: 'user-1',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    owner: {
      id: 'user-1',
      username: 'owner',
      profile: { displayName: 'Owner Name', fullName: null },
    },
    product: {
      id: 'product-1',
      productCode: 'COURSE_001',
      name: 'Course',
      status: ProductStatus.ACTIVE,
    },
    ...overrides,
  });

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      activeUserExists: jest.fn(),
      findOwnerOptions: jest.fn(),
      productExists: jest.fn(),
    } as unknown as jest.Mocked<ProjectRepository>;
    service = new ProjectService(repository);
  });

  it('requires a current organization', () => {
    expect(() => service.requireOrgId(null)).toThrow(ForbiddenException);
    expect(service.requireOrgId('org-1')).toBe('org-1');
  });

  it('creates a normalized project in the authenticated organization', async () => {
    repository.findBySlug.mockResolvedValue(null);
    repository.activeUserExists.mockResolvedValue(true);
    repository.productExists.mockResolvedValue(true);
    repository.create.mockImplementation((data) =>
      Promise.resolve(
        project({
          orgId: data.orgId,
          title: data.title,
          code: data.code,
          status: data.status,
          tags: data.tags,
          publishedAt: data.publishedAt,
        }) as never,
      ),
    );

    const result = await service.create(
      'org-1',
      {
        title: ' Project One ',
        slug: 'project-one',
        status: ProjectStatus.PUBLISHED,
        ownerId: 'user-1',
        productId: 'product-1',
        tags: [' Web ', 'Web'],
        prerequisites: [' TypeScript ', 'TypeScript'],
        metadata: { source: 'test' },
      },
      'user-1',
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        title: 'Project One',
        code: expect.stringMatching(/^PRJ-\d{4}-[A-F0-9]{12}$/),
        tags: ['Web'],
        prerequisites: ['TypeScript'],
        createdById: 'user-1',
        updatedById: 'user-1',
        publishedAt: expect.any(Date),
      }),
    );
    expect(result.owner).toEqual({ id: 'user-1', displayName: 'Owner Name' });
  });

  it('rejects duplicate slugs, invalid relations, capacity, and date ranges', async () => {
    repository.findBySlug.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create('org-1', { title: 'Duplicate', slug: 'duplicate' }),
    ).rejects.toThrow('Project slug already exists');

    repository.findBySlug.mockResolvedValue(null);
    repository.activeUserExists.mockResolvedValue(false);
    await expect(
      service.create('org-1', { title: 'Invalid owner', ownerId: 'user-2' }),
    ).rejects.toThrow('active user');

    await expect(
      service.create('org-1', {
        title: 'Invalid dates',
        startDate: '2026-09-02T00:00:00.000Z',
        endDate: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('End date cannot be before start date');
  });

  it('searches active global users as owner options', async () => {
    repository.findOwnerOptions.mockResolvedValue([
      {
        id: 'external-user',
        username: 'external',
        email: 'external@example.com',
        profile: { displayName: '外部主导人', fullName: null },
      },
    ]);

    await expect(
      service.findOwnerOptions({ keyword: ' 外部 ' }),
    ).resolves.toEqual({
      items: [{ id: 'external-user', displayName: '外部主导人' }],
    });
    expect(repository.findOwnerOptions).toHaveBeenCalledWith({
      keyword: '外部',
    });
  });

  it('backfills a generated code when a legacy project is next saved', async () => {
    repository.findById.mockResolvedValue(project({ code: null }) as never);
    repository.update.mockImplementation((_id, _orgId, data) =>
      Promise.resolve(project({ code: data.code, title: data.title }) as never),
    );

    const result = await service.update(
      'project-1',
      'org-1',
      { title: 'Updated legacy project' },
      'user-1',
    );

    expect(repository.update).toHaveBeenCalledWith(
      'project-1',
      'org-1',
      expect.objectContaining({
        code: expect.stringMatching(/^PRJ-\d{4}-[A-F0-9]{12}$/),
      }),
    );
    expect(result.code).toMatch(/^PRJ-\d{4}-[A-F0-9]{12}$/);
  });

  it('applies organization filters and stable sorting to list queries', async () => {
    repository.findMany.mockResolvedValue({
      items: [project() as never],
      total: 1,
    });

    const result = await service.findAll('org-1', {
      page: 2,
      pageSize: 20,
      keyword: 'project',
      status: ProjectStatus.PUBLISHED,
      level: ProjectLevel.BEGINNER,
      isFeatured: true,
      sortField: 'updatedAt',
      sortOrder: 'desc',
    });

    expect(repository.findMany).toHaveBeenCalledWith({
      skip: 20,
      take: 20,
      where: expect.objectContaining({
        orgId: 'org-1',
        deletedAt: null,
        status: ProjectStatus.PUBLISHED,
        isFeatured: true,
        OR: expect.any(Array),
      }),
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 20 });
  });

  it('returns the active student count and prevents lowering capacity below it', async () => {
    repository.findById.mockResolvedValue(project() as never);

    await expect(
      service.update('project-1', 'org-1', { maxStudents: 9 }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(await service.findById('project-1', 'org-1')).toEqual(
      expect.objectContaining({ enrolledCount: 10 }),
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('backfills the first publication timestamp and preserves tenant scope', async () => {
    repository.findById.mockResolvedValue(project() as never);
    repository.update.mockImplementation((_id, _orgId, data) =>
      Promise.resolve(
        project({
          status: data.status,
          publishedAt: data.publishedAt,
          updatedById: data.updatedById,
        }) as never,
      ),
    );

    const result = await service.updateStatus(
      'project-1',
      'org-1',
      ProjectStatus.ENROLLING,
      'user-2',
    );

    expect(repository.update).toHaveBeenCalledWith(
      'project-1',
      'org-1',
      expect.objectContaining({
        status: ProjectStatus.ENROLLING,
        publishedAt: expect.any(Date),
        updatedById: 'user-2',
      }),
    );
    expect(result.status).toBe(ProjectStatus.ENROLLING);
  });

  it('soft deletes only an existing project in the current organization', async () => {
    repository.findById.mockResolvedValue(project() as never);
    repository.softDelete.mockResolvedValue(project() as never);

    await service.delete('project-1', 'org-1', 'user-1');

    expect(repository.softDelete).toHaveBeenCalledWith(
      'project-1',
      'org-1',
      'user-1',
    );

    repository.findById.mockResolvedValue(null);
    await expect(
      service.findById('foreign-project', 'org-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
