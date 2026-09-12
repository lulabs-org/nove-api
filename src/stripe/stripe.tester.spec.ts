/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeTesterService } from './stripe.tester';
import { IntegrationTesterService } from '@/admin/integrations';

jest.mock('stripe');

describe('StripeTesterService', () => {
  let service: StripeTesterService;
  let testerService: IntegrationTesterService;
  let mockAccountsRetrieve: jest.Mock;

  beforeEach(() => {
    mockAccountsRetrieve = jest.fn();
    (Stripe as unknown as jest.Mock).mockImplementation(() => ({
      accounts: {
        retrieve: mockAccountsRetrieve,
      },
    }));

    testerService = {
      registerProvider: jest.fn(),
    } as unknown as IntegrationTesterService;

    service = new StripeTesterService(testerService);
  });

  it('registers provider onModuleInit', () => {
    service.onModuleInit();
    expect(testerService.registerProvider).toHaveBeenCalledWith(
      'stripe',
      service,
    );
  });

  it('throws BadRequestException if secretKey is missing', async () => {
    await expect(service.test({ secretKey: '' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('passes when accounts.retrieve succeeds (200)', async () => {
    mockAccountsRetrieve.mockResolvedValue({
      id: 'acct_123',
      business_profile: { name: 'Test Org' },
    });

    await expect(
      service.test({ secretKey: 'sk_live_valid' }),
    ).resolves.toBeUndefined();
    expect(mockAccountsRetrieve).toHaveBeenCalled();
  });

  it('passes when accounts.retrieve returns 403 more_permissions_required (restricted key)', async () => {
    const error = new Error('Permission denied') as Error & {
      statusCode: number;
      code: string;
    };
    error.statusCode = 403;
    error.code = 'more_permissions_required';
    mockAccountsRetrieve.mockRejectedValue(error);

    await expect(
      service.test({ secretKey: 'rk_live_restricted' }),
    ).resolves.toBeUndefined();
  });

  it('throws when accounts.retrieve returns 401 (invalid key)', async () => {
    const error = new Error('Invalid API Key provided') as Error & {
      statusCode: number;
      code: string;
    };
    error.statusCode = 401;
    error.code = 'invalid_api_key';
    mockAccountsRetrieve.mockRejectedValue(error);

    await expect(
      service.test({ secretKey: 'sk_live_invalid' }),
    ).rejects.toThrow('Invalid API Key provided');
  });

  it('throws when accounts.retrieve fails with connection error', async () => {
    const error = new Error('An error occurred with our connection to Stripe');
    mockAccountsRetrieve.mockRejectedValue(error);

    await expect(service.test({ secretKey: 'sk_live_valid' })).rejects.toThrow(
      'An error occurred with our connection to Stripe',
    );
  });
});
