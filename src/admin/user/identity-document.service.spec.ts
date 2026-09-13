import { BadRequestException } from '@nestjs/common';
import {
  DocumentVerifyStatus,
  IdentityDocumentType,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { DriveAclService } from '@/drive/policies';
import { IdentityDocumentService } from './identity-document.service';

const record = (
  status: DocumentVerifyStatus = DocumentVerifyStatus.UNVERIFIED,
) => ({
  id: 'document-1',
  userId: 'user-1',
  documentType: IdentityDocumentType.ID_CARD,
  issuingCountry: 'CHN',
  holderName: '张三',
  maskedNumber: '110101********1234',
  issueDate: new Date('2020-01-01T00:00:00.000Z'),
  expiryDate: new Date('2040-01-01T00:00:00.000Z'),
  isPermanent: false,
  issuingAuthority: null,
  metadata: null,
  status,
  rejectReason: null,
  verifiedAt: null,
  isPrimary: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  frontFile: null,
  backFile: null,
});

function firstCall<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as unknown[][];
  return calls[0][0] as T;
}

describe('IdentityDocumentService', () => {
  let prisma: {
    user: { findFirst: jest.Mock };
    userIdentityDocument: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: IdentityDocumentService;

  beforeEach(() => {
    process.env.SYSTEM_ENCRYPTION_KEY = 'unit-test-identity-key';
    const transaction = jest.fn(
      (callback: (client: PrismaService) => unknown) =>
        callback(prisma as unknown as PrismaService),
    );
    prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }) },
      userIdentityDocument: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      $transaction: transaction,
    };
    service = new IdentityDocumentService(
      prisma as unknown as PrismaService,
      { assertNodeAction: jest.fn() } as unknown as DriveAclService,
    );
  });

  it('encrypts and masks a document number without returning plaintext', async () => {
    prisma.userIdentityDocument.create.mockResolvedValue({ id: 'document-1' });
    prisma.userIdentityDocument.findUniqueOrThrow.mockResolvedValue(record());

    const result = await service.create(
      'user-1',
      {
        documentType: IdentityDocumentType.ID_CARD,
        issuingCountry: 'CHN',
        holderName: '张三',
        documentNumber: '110101 19900101 1234',
        issueDate: '2020-01-01',
        expiryDate: '2040-01-01',
      },
      {
        authMethod: 'jwt',
        userId: 'admin-1',
        orgId: 'org-1',
        permissions: [],
      },
    );

    const { data } = firstCall<{
      data: { numberCipher: string; numberHash: string; maskedNumber: string };
    }>(prisma.userIdentityDocument.create);
    expect(data.numberCipher).not.toContain('110101199001011234');
    expect(data.numberHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.maskedNumber).toBe('110101********1234');
    expect(result).not.toHaveProperty('numberCipher');
    expect(result).not.toHaveProperty('numberHash');
    expect(result.maskedNumber).toBe('110101********1234');
  });

  it('moves a rejected document back to pending when resubmitted', async () => {
    prisma.userIdentityDocument.findFirst.mockResolvedValue(
      record(DocumentVerifyStatus.REJECTED),
    );
    prisma.userIdentityDocument.update.mockResolvedValue(
      record(DocumentVerifyStatus.PENDING),
    );

    const result = await service.submit('user-1', 'document-1');

    const updateInput = firstCall<{
      data: { status: DocumentVerifyStatus; rejectReason: string | null };
    }>(prisma.userIdentityDocument.update);
    expect(updateInput.data).toMatchObject({
      status: DocumentVerifyStatus.PENDING,
      rejectReason: null,
    });
    expect(result.status).toBe(DocumentVerifyStatus.PENDING);
  });

  it('requires a rejection reason during review', async () => {
    prisma.userIdentityDocument.findFirst.mockResolvedValue(
      record(DocumentVerifyStatus.PENDING),
    );

    await expect(
      service.review('user-1', 'document-1', { status: 'REJECTED' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow reviewing a draft directly', async () => {
    prisma.userIdentityDocument.findFirst.mockResolvedValue(record());

    await expect(
      service.review('user-1', 'document-1', { status: 'VERIFIED' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
