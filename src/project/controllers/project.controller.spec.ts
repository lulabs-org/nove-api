/* eslint-disable @typescript-eslint/unbound-method */
import { ProjectStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { ProjectController } from './project.controller';

describe('ProjectController', () => {
  let controller: ProjectController;
  let service: jest.Mocked<ProjectService>;

  beforeEach(() => {
    service = {
      requireOrgId: jest.fn((orgId?: string | null) => {
        if (!orgId) throw new Error('Current organization is required');
        return orgId;
      }),
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProjectService>;
    controller = new ProjectController(service);
  });

  it('passes the authenticated organization and actor to writes', async () => {
    service.create.mockResolvedValue({ id: 'project-1' } as never);

    await controller.create({ title: 'Project' }, 'org-1', 'user-1');

    expect(service.create).toHaveBeenCalledWith(
      'org-1',
      { title: 'Project' },
      'user-1',
    );
  });

  it('never accepts tenant scope from path or body for reads and status changes', async () => {
    service.findById.mockResolvedValue({ id: 'project-1' } as never);
    service.updateStatus.mockResolvedValue({ id: 'project-1' } as never);

    await controller.findById('project-1', 'org-1');
    await controller.updateStatus(
      'project-1',
      { status: ProjectStatus.COMPLETED },
      'org-1',
      'user-1',
    );

    expect(service.findById).toHaveBeenCalledWith('project-1', 'org-1');
    expect(service.updateStatus).toHaveBeenCalledWith(
      'project-1',
      'org-1',
      ProjectStatus.COMPLETED,
      'user-1',
    );
  });

  it('publishes the project routes and relation schemas in OpenAPI', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [{ provide: ProjectService, useValue: service }],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Project contract').build(),
    );

    expect(document.paths).toHaveProperty('/admin/projects');
    expect(document.paths).toHaveProperty('/admin/projects/{id}');
    expect(document.paths).toHaveProperty('/admin/projects/{id}/status');
    expect(document.components?.schemas?.ProjectDto).toMatchObject({
      properties: {
        metadata: { additionalProperties: true, type: 'object' },
        owner: { nullable: true },
        product: { nullable: true },
      },
    });
    await app.close();
  });
});
