import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiOkResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { MinuteDto, QueryMinuteDto } from './minute.dto';

@Controller('minute-contract-test')
class MinuteContractTestController {
  @Get()
  @ApiOkResponse({ type: MinuteDto })
  get(): void {}
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
      expect(schema.properties).not.toHaveProperty('status');
    } finally {
      await app.close();
    }
  });
});
