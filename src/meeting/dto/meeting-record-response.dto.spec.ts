import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiOkResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {
  MeetingRecordListResponseDto,
  MeetingRecordResponseDto,
} from './meeting-record-response.dto';

@Controller('meeting-contract-test')
class MeetingContractTestController {
  @Get()
  @ApiOkResponse({ type: MeetingRecordListResponseDto })
  list(): void {}

  @Get(':id')
  @ApiOkResponse({ type: MeetingRecordResponseDto })
  detail(): void {}
}

describe('Meeting response OpenAPI contract', () => {
  let app: INestApplication;
  let schemas: Record<string, SchemaObject>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MeetingContractTestController],
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

  const property = (schemaName: string, propertyName: string): SchemaObject => {
    const schema = schemas[schemaName];
    return schema.properties?.[propertyName] as SchemaObject;
  };

  it('documents nullable detail scalar fields with their JSON types', () => {
    expect(property('MeetingRecordResponseDto', 'subMeetingId')).toMatchObject({
      type: 'string',
    });
    expect(property('MeetingRecordResponseDto', 'externalId')).toMatchObject({
      type: 'string',
      nullable: true,
    });
    expect(
      property('MeetingRecordResponseDto', 'participantCount'),
    ).toMatchObject({ type: 'number', nullable: true });
    expect(property('MeetingRecordResponseDto', 'startAt')).toMatchObject({
      type: 'string',
      format: 'date-time',
      nullable: true,
    });
    expect(
      property('MeetingRecordResponseDto', 'durationSeconds'),
    ).toMatchObject({ type: 'number', nullable: true });
    expect(property('MeetingRecordResponseDto', 'host')).toMatchObject({
      type: 'object',
      nullable: true,
    });
    const host = property('MeetingRecordResponseDto', 'host');
    expect(host.properties?.displayName).toMatchObject({
      type: 'string',
      nullable: true,
    });
  });

  it('uses a dedicated minimal schema for list items', () => {
    const listItem = schemas.MeetingListItemResponseDto;

    expect(Object.keys(listItem.properties ?? {})).toEqual([
      'id',
      'title',
      'platform',
      'startAt',
      'endAt',
      'host',
      'participantCount',
      'hasRecording',
    ]);
    expect(listItem.properties).not.toHaveProperty('metadata');
    expect(listItem.properties).not.toHaveProperty('subMeetingId');
    expect(listItem.properties).not.toHaveProperty('deletedAt');
  });
});
