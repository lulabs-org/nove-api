import { PrismaClient } from '@prisma/client';

export async function createOAuthClients(
  prisma: PrismaClient,
): Promise<void> {
  console.log(`🔑 开始创建 OAuth Clients 数据...`);

  try {
    const oauthClient = await prisma.oAuthClient.upsert({
      where: { clientId: 'nove-cli' },
      update: {
        clientSecret: null,
        clientType: 'PUBLIC',
        name: 'Nove CLI',
        description: 'Official Nove command line client',
        redirectUris: ['http://127.0.0.1/oauth/callback'],
        grants: ['authorization_code', 'refresh_token'],
        scopes: [
          'meeting:read',
          'meeting:create',
          'meeting:update',
          'meeting:delete',
          'meeting:stats_view',
          'minute:read',
          'minute:delete',
          'speaker-summary:read',
          'speaker-summary:create',
          'speaker-summary:update',
          'speaker-summary:delete',
          'tracking-report:read',
          'tracking-report:create',
          'tracking-report:update',
          'tracking-report:delete',
          'user:read',
          'user:create',
          'user:update',
          'user:delete',
        ],
      },
      create: {
        clientId: 'nove-cli',
        clientSecret: null,
        clientType: 'PUBLIC',
        name: 'Nove CLI',
        description: 'Official Nove command line client',
        redirectUris: ['http://127.0.0.1/oauth/callback'],
        grants: ['authorization_code', 'refresh_token'],
        scopes: [
          'meeting:read',
          'meeting:create',
          'meeting:update',
          'meeting:delete',
          'meeting:stats_view',
          'minute:read',
          'minute:delete',
          'speaker-summary:read',
          'speaker-summary:create',
          'speaker-summary:update',
          'speaker-summary:delete',
          'tracking-report:read',
          'tracking-report:create',
          'tracking-report:update',
          'tracking-report:delete',
          'user:read',
          'user:create',
          'user:update',
          'user:delete',
        ],
      },
    });

    console.log(`✅ 创建/更新 OAuth Client: ${oauthClient.name}`);
  } catch (error) {
    console.error('❌ 创建 OAuth Client 数据失败:', error);
    throw error;
  }
}
