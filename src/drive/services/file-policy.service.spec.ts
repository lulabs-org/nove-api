import { BadRequestException } from '@nestjs/common';
import { SystemConfigService } from '@/admin/system-config/system-config.service';
import { FilePolicyService } from './file-policy.service';

describe('FilePolicyService', () => {
  const config = { getConfig: jest.fn() };
  const service = new FilePolicyService(
    config as unknown as SystemConfigService,
  );

  beforeEach(() => config.getConfig.mockResolvedValue(null));

  it('accepts an allowed declaration and normalizes its name', async () => {
    await expect(
      service.validateDeclaration(' report.PDF ', 'application/pdf', 1024n),
    ).resolves.toBe('report.PDF');
  });

  it('rejects disabled and dangerous extensions', async () => {
    config.getConfig.mockResolvedValue({ allowedExtensions: ['.pdf'] });
    await expect(
      service.validateDeclaration('image.png', 'image/png', 1024n),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.validateDeclaration('archive.zip', 'application/zip', 1024n),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks OpenXML internal package markers', () => {
    expect(() =>
      service.validateMagic(
        'report.docx',
        Buffer.from('PK\u0003\u0004[Content_Types].xml word/document.xml'),
      ),
    ).not.toThrow();
    expect(() =>
      service.validateMagic(
        'report.docx',
        Buffer.from('PK\u0003\u0004xl/workbook.xml'),
      ),
    ).toThrow(BadRequestException);
  });

  it('requires malware scanning for documents but not media containers', () => {
    expect(service.requiresMalwareScan('invoice.pdf')).toBe(true);
    expect(service.requiresMalwareScan('diagram.svg')).toBe(true);
    expect(service.requiresMalwareScan('meeting.mp4')).toBe(false);
    expect(service.requiresMalwareScan('meeting.m4a')).toBe(false);
  });
});
