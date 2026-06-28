/**
 * OAuth 测试环境初始化脚本
 * 
 * 用途:
 * 1. 在本地数据库中创建一个测试专用的 OAuth 第三方应用 (OAuthClient)
 * 2. 在本地数据库中创建一个测试专用的系统普通用户 (User)
 * 
 * 运行方式:
 * 在项目根目录下运行: npx tsx scripts/test-oauth-setup.ts
 * 
 * 注意: 这个脚本主要是为了方便在本地直接测试 OAuth 登录授权链路，无需前端页面。
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化 OAuth 测试数据...');

  // 1. 创建或获取测试的 OAuth 客户端
  let client = await prisma.oAuthClient.findUnique({
    where: { clientId: 'curl-test-client' }
  });

  const rawSecret = 'curl-test-secret';
  // 按照 oauth-client.service.ts 中的逻辑，clientSecret 需要经过 bcrypt 哈希
  const hashedSecret = await bcrypt.hash(rawSecret, 10);

  if (!client) {
    client = await prisma.oAuthClient.create({
      data: {
        clientId: 'curl-test-client',
        clientSecret: hashedSecret,
        name: 'Curl Test App',
        redirectUris: ['http://localhost:3000/callback'], // 测试用的回调地址
        grants: ['authorization_code', 'refresh_token'],
        scopes: ['read', 'write'],
      }
    });
    console.log('✅ 成功创建测试 OAuth 客户端');
  } else {
    // 如果已经存在，更新一下密钥以防之前的哈希不一致
    client = await prisma.oAuthClient.update({
      where: { clientId: 'curl-test-client' },
      data: { clientSecret: hashedSecret }
    });
    console.log('✅ 测试 OAuth 客户端已存在，已更新其 Secret');
  }

  // 2. 创建或获取测试的用户
  let user = await prisma.user.findUnique({
    where: { email: 'curl_test@example.com' }
  });

  const rawPassword = 'password123';
  // 密码同样需要 bcrypt 哈希存储
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'curl_test@example.com',
        passwordHash: hashedPassword,
        active: true, // 确保用户是激活状态，能够正常登录
      }
    });
    console.log('✅ 成功创建测试用户');
  } else {
    user = await prisma.user.update({
      where: { email: 'curl_test@example.com' },
      data: { passwordHash: hashedPassword }
    });
    console.log('✅ 测试用户已存在，已更新其密码');
  }

  console.log('\n--- 准备工作完成 ---');
  console.log('测试环境准备完毕，你可以使用以下凭证进行测试:');
  console.log(JSON.stringify({
    clientId: client.clientId,
    clientSecret: rawSecret,
    userEmail: user.email,
    userPassword: rawPassword
  }, null, 2));
}

main()
  .catch(e => console.error('初始化数据失败:', e))
  .finally(() => prisma.$disconnect());
