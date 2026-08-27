import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiOkResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {
  PlatformUserMinuteTranscriptsResponseDto,
  PlatformUserTranscriptContextResponseDto,
  QueryPlatformUserMinuteTranscriptsDto,
  QueryPlatformUserTranscriptContextDto,
} from './platform-user-transcript.dto';

@Controller('platform-user-transcript-contract-test')
class PlatformUserTranscriptContractTestController {
  @Get('minutes')
  @ApiOkResponse({ type: PlatformUserMinuteTranscriptsResponseDto })
  getMinutes(): void {}

  @Get('context')
  @ApiOkResponse({ type: PlatformUserTranscriptContextResponseDto })
  getContext(): void {}
}

describe('Platform user transcript query DTOs', () => {
  it('accepts timezone-explicit minute transcript dates', async () => {
    const dto = plainToInstance(QueryPlatformUserMinuteTranscriptsDto, {
      startDate: '2026-08-01T00:00:00+08:00',
      endDate: '2026-09-01T00:00:00+08:00',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects dates without timezone information', async () => {
    const dto = plainToInstance(QueryPlatformUserMinuteTranscriptsDto, {
      startDate: '2026-08-01T00:00:00',
      endDate: '2026-08-02T00:00:00',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['startDate', 'endDate']),
    );
  });

  it.each([0, 20])('accepts context depth %s', async (depth) => {
    const dto = plainToInstance(QueryPlatformUserTranscriptContextDto, {
      depth: String(depth),
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.depth).toBe(depth);
  });

  it.each([-1, 21, 1.5])('rejects invalid context depth %s', async (depth) => {
    const dto = plainToInstance(QueryPlatformUserTranscriptContextDto, {
      depth,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});

describe('Platform user transcript response OpenAPI contract', () => {
  let app: INestApplication;
  let schemas: Record<string, SchemaObject>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PlatformUserTranscriptContractTestController],
    }).compile();
    app = moduleRef.createNestApplication();

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    schemas = document.components?.schemas as Record<string, SchemaObject>;
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    'PlatformUserTranscriptSegmentDto',
    'PlatformUserTranscriptContextSegmentDto',
  ])('documents %s platformUser as a nullable object', (schemaName) => {
    const segment = schemas[schemaName];
    const platformUser = segment.properties?.platformUser as SchemaObject;

    expect(platformUser).toMatchObject({
      type: 'object',
      nullable: true,
    });
    expect(platformUser).not.toHaveProperty('allOf');
    expect(platformUser.properties?.id).toMatchObject({ type: 'string' });
    expect(platformUser.properties?.displayName).toMatchObject({
      type: 'string',
      nullable: true,
    });
    expect(segment.required).toContain('platformUser');
  });

  it('documents minute meeting metadata as nullable', () => {
    const minute = schemas.PlatformUserTranscriptMinuteDto;
    const meeting = minute.properties?.meeting as SchemaObject;

    expect(meeting).toMatchObject({ type: 'object', nullable: true });
    expect(meeting).not.toHaveProperty('allOf');
    expect(meeting.properties?.meetingId).toMatchObject({ type: 'string' });
    expect(minute.required).toContain('meeting');
  });
});
