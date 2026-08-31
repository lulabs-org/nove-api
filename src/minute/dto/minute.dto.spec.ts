import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiOkResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { MinuteDto, MinuteListResponseDto, QueryMinuteDto } from './minute.dto';

@Controller('minute-contract-test')
class MinuteContractTestController {
  @Get()
  @ApiOkResponse({ type: MinuteDto })
  get(): void {}

  @Get('list')
  @ApiOkResponse({ type: MinuteListResponseDto })
  list(): void {}
}

describe('minute DTO contract', () => {
  it('rejects the removed status query field', async () => {
    const dto = plainToInstance(QueryMinuteDto, { status: 'COMPLETED' });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((error) => error.property)).toContain('status');
  });

  it('documents errorMessage instead of status', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MinuteContractTestController],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication();

    try {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );
      const schema = document.components?.schemas?.MinuteDto as SchemaObject;

      expect(schema.properties?.errorMessage).toMatchObject({
        type: 'string',
        nullable: true,
      });
      expect(schema.properties?.meetingId).toMatchObject({
        type: 'string',
        nullable: true,
      });
      expect(schema.properties?.meeting).toMatchObject({
        allOf: [{ $ref: '#/components/schemas/MinuteMeetingDto' }],
        nullable: true,
      });
      expect(schema.properties?.recorderUserId).toMatchObject({
        type: 'string',
        nullable: true,
      });
      expect(schema.properties?.startAt).toMatchObject({
        type: 'string',
        format: 'date-time',
        nullable: true,
      });
      expect(schema.properties?.endAt).toMatchObject({
        type: 'string',
        format: 'date-time',
        nullable: true,
      });
      expect(schema.properties?.deletedAt).toMatchObject({
        type: 'string',
        format: 'date-time',
        nullable: true,
      });
      expect(schema.properties).not.toHaveProperty('status');

      const listSchema = document.components?.schemas
        ?.MinuteListResponseDto as SchemaObject;
      expect(listSchema.properties?.data).toMatchObject({
        type: 'array',
        items: {
          $ref: '#/components/schemas/MinuteDto',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('accepts the minute search query field', async () => {
    const dto = plainToInstance(QueryMinuteDto, { search: '周会' });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
    expect(dto.search).toBe('周会');
  });
});
