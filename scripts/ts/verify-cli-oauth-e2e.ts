import 'dotenv/config';

import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const apiBaseUrl = process.env.OAUTH_E2E_API_URL || 'http://127.0.0.1:3000';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function json<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function main() {
  const suffix = crypto.randomBytes(8).toString('hex');
  const role = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  assert(role, 'SUPER_ADMIN role is required for the OAuth E2E verifier');

  const user = await prisma.user.create({
    data: {
      active: true,
      email: `oauth-e2e-${suffix}@example.test`,
      orgMembers: {
        create: {
          orgId: role.orgId,
          status: 'ACTIVE',
          memberRoles: { create: { roleId: role.id } },
        },
      },
    },
  });
  let requestId: string | undefined;

  try {
    const jwtSecret = process.env.JWT_SECRET;
    assert(jwtSecret, 'JWT_SECRET is required');
    const userAccessToken = new JwtService().sign(
      { sub: user.id },
      { expiresIn: '5m', jwtid: crypto.randomUUID(), secret: jwtSecret },
    );
    const state = crypto.randomBytes(32).toString('base64url');
    const verifier = crypto.randomBytes(48).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    const redirectUri = 'http://127.0.0.1:45873/oauth/callback';
    const authorizeUrl = new URL('/api/oauth/authorize', apiBaseUrl);
    authorizeUrl.search = new URLSearchParams([
      ['client_id', 'nove-cli'],
      ['code_challenge', challenge],
      ['code_challenge_method', 'S256'],
      ['redirect_uri', redirectUri],
      ['response_type', 'code'],
      ['scope', 'meeting:read meeting:delete'],
      ['state', state],
    ]).toString();

    const authorization = await fetch(authorizeUrl, { redirect: 'manual' });
    assert(
      authorization.status === 302,
      'Authorization endpoint must redirect to consent',
    );
    const consentLocation = authorization.headers.get('location');
    assert(consentLocation, 'Consent redirect is missing');
    requestId =
      new URL(consentLocation).searchParams.get('request_id') ?? undefined;
    assert(requestId, 'Consent redirect is missing request_id');

    const details = await json<{
      organizations: Array<{ id: string }>;
      permissions: Array<{ code: string }>;
    }>(
      await fetch(
        new URL(`/api/oauth/authorization-requests/${requestId}`, apiBaseUrl),
        { headers: { Authorization: `Bearer ${userAccessToken}` } },
      ),
    );
    assert(
      details.permissions.some(({ code }) => code === 'meeting:read') &&
        details.permissions.some(({ code }) => code === 'meeting:delete'),
      'Consent details must expose the requested user permissions',
    );
    assert(
      details.organizations.some(({ id }) => id === role.orgId),
      'Consent details must expose the active organization',
    );

    const approval = await json<{ redirect_uri: string }>(
      await fetch(
        new URL(
          `/api/oauth/authorization-requests/${requestId}/approve`,
          apiBaseUrl,
        ),
        {
          body: JSON.stringify({
            organization_id: role.orgId,
            scopes: ['meeting:read'],
          }),
          headers: {
            Authorization: `Bearer ${userAccessToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        },
      ),
    );
    const callback = new URL(approval.redirect_uri);
    assert(
      callback.searchParams.get('state') === state,
      'OAuth state was not preserved',
    );
    const code = callback.searchParams.get('code');
    assert(code, 'Authorization callback did not contain a code');

    const token = await json<{
      access_token: string;
      refresh_token: string;
      scope: string;
    }>(
      await fetch(new URL('/api/oauth/token', apiBaseUrl), {
        body: new URLSearchParams([
          ['client_id', 'nove-cli'],
          ['code', code],
          ['code_verifier', verifier],
          ['grant_type', 'authorization_code'],
          ['redirect_uri', redirectUri],
        ]),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      }),
    );
    assert(
      token.scope === 'meeting:read',
      'Issued token scope must equal the selected subset',
    );

    const readResponse = await fetch(new URL('/meetings?limit=1', apiBaseUrl), {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    assert(
      readResponse.ok,
      `Granted meeting read failed with HTTP ${readResponse.status}`,
    );

    const deniedDelete = await fetch(
      new URL('/meetings/non-existent-e2e-id', apiBaseUrl),
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
        method: 'DELETE',
      },
    );
    assert(
      deniedDelete.status === 403,
      `Ungranted meeting delete must return 403, got ${deniedDelete.status}`,
    );

    const refreshed = await json<{ refresh_token: string }>(
      await fetch(new URL('/api/oauth/token', apiBaseUrl), {
        body: new URLSearchParams([
          ['client_id', 'nove-cli'],
          ['grant_type', 'refresh_token'],
          ['refresh_token', token.refresh_token],
        ]),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      }),
    );
    assert(
      refreshed.refresh_token !== token.refresh_token,
      'Refresh token was not rotated',
    );

    const reuse = await fetch(new URL('/api/oauth/token', apiBaseUrl), {
      body: new URLSearchParams([
        ['client_id', 'nove-cli'],
        ['grant_type', 'refresh_token'],
        ['refresh_token', token.refresh_token],
      ]),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    });
    assert(
      reuse.status === 401,
      'Rotated refresh token reuse must be rejected',
    );

    const revoke = await fetch(new URL('/api/oauth/revoke', apiBaseUrl), {
      body: new URLSearchParams([
        ['client_id', 'nove-cli'],
        ['token', refreshed.refresh_token],
      ]),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    });
    assert(revoke.ok, `OAuth revoke failed with HTTP ${revoke.status}`);

    console.log(
      JSON.stringify({
        authorizationRedirect: true,
        grantedRead: true,
        pkceExchange: true,
        refreshRotation: true,
        refreshReuseRejected: true,
        revoke: true,
        scopeEnforced: true,
      }),
    );
  } finally {
    if (requestId) {
      await prisma.oAuthAuthorizationRequest.deleteMany({
        where: { id: requestId },
      });
    }
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
