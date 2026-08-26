import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GenerationMethod } from '@prisma/client';
import { CreateSpeakerSummaryDto } from './speaker-summary.dto';

const validSummary = {
  platformUserId: 'cmt4uz61o0000cc0dnqdq1lza',
  partSummary: '参会者总结',
};

describe('CreateSpeakerSummaryDto', () => {
  it('accepts a supported generation method and AI model', async () => {
    const dto = plainToInstance(CreateSpeakerSummaryDto, {
      ...validSummary,
      generatedBy: GenerationMethod.AI,
      aiModel: 'gpt-4o',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an unsupported generation method', async () => {
    const dto = plainToInstance(CreateSpeakerSummaryDto, {
      ...validSummary,
      generatedBy: 'UNKNOWN',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('generatedBy');
  });
});
