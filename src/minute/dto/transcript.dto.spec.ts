import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiOkResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { TranscriptJsonResponseDto } from './transcript.dto';

@Controller('transcript-contract-test')
class TranscriptContractTestController {
  @Get()
  @ApiOkResponse({ type: TranscriptJsonResponseDto })
  get(): void {}
}

describe('Transcript response OpenAPI contract', () => {
  let app: INestApplication;
  let schemas: Record<string, SchemaObject>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TranscriptContractTestController],
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

  it('documents platform and local users as required nullable objects', () => {
    const paragraph = schemas.TranscriptParagraphDto;
    const platformUser = paragraph.properties?.platformUser as SchemaObject;
    const user = paragraph.properties?.user as SchemaObject;

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

    expect(user).toMatchObject({
      type: 'object',
      nullable: true,
    });
    expect(user).not.toHaveProperty('allOf');
    expect(user.properties?.id).toMatchObject({ type: 'string' });
    expect(user.properties?.displayName).toMatchObject({
      type: 'string',
      nullable: true,
    });
    expect(user.properties?.fullName).toMatchObject({
      type: 'string',
      nullable: true,
    });

    expect(paragraph.required).toEqual(
      expect.arrayContaining(['platformUser', 'user']),
    );
  });
});
