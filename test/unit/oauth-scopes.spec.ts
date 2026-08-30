import { NOVE_CLI_OAUTH_SCOPES } from '../../prisma/seeds/oauth-scopes';

describe('Nove CLI OAuth scopes', () => {
  it('contains every product and order permission without duplicates', () => {
    expect(NOVE_CLI_OAUTH_SCOPES).toEqual(
      expect.arrayContaining([
        'product:read',
        'product:create',
        'product:update',
        'product:toggle-status',
        'product:delete',
        'order:read',
        'order:create',
        'order:update',
        'order:status',
        'order:delete',
      ]),
    );
    expect(new Set(NOVE_CLI_OAUTH_SCOPES).size).toBe(
      NOVE_CLI_OAUTH_SCOPES.length,
    );
  });
});
