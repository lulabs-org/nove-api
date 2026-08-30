import { PrismaClient } from '@prisma/client';
import { NOVE_CLI_OAUTH_SCOPES } from '../../oauth-scopes';

export async function createOAuthClients(prisma: PrismaClient): Promise<void> {
  console.log(`🔑 开始创建 OAuth Clients 数据...`);

  try {
    const oauthClient = await prisma.oAuthClient.upsert({
      where: { clientId: 'nove-cli' },
      update: {
        clientSecret: null,
        clientType: 'PUBLIC',
        name: 'Nove CLI',
        description: 'Official Nove command line client',
        isSystem: true,
        status: 'ACTIVE',
        redirectUris: ['http://127.0.0.1/oauth/callback'],
        grants: ['authorization_code', 'refresh_token'],
        scopes: [...NOVE_CLI_OAUTH_SCOPES],
      },
      create: {
        clientId: 'nove-cli',
        clientSecret: null,
        clientType: 'PUBLIC',
        name: 'Nove CLI',
        description: 'Official Nove command line client',
        isSystem: true,
        redirectUris: ['http://127.0.0.1/oauth/callback'],
        grants: ['authorization_code', 'refresh_token'],
        scopes: [...NOVE_CLI_OAUTH_SCOPES],
      },
    });

    console.log(`✅ 创建/更新 OAuth Client: ${oauthClient.name}`);
  } catch (error) {
    console.error('❌ 创建 OAuth Client 数据失败:', error);
    throw error;
  }
}
