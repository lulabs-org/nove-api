import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 开始测试 OAuth 2.0 流程 ---');

  // 1. 创建第三方客户端 (OAuth Client)
  console.log('\n1. 创建 OAuth 客户端...');
  const clientId = crypto.randomBytes(16).toString('hex');
  const clientSecret = 'super-secret-key';
  const hashedSecret = await bcrypt.hash(clientSecret, 10);
  
  const client = await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecret: hashedSecret,
      name: 'Test App',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['user:read'],
      grants: ['authorization_code', 'refresh_token']
    }
  });
  console.log(`✅ 客户端创建成功! ClientID: ${client.clientId}`);

  // 2. 找到一个测试用户
  console.log('\n2. 获取测试用户...');
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('❌ 数据库中没有用户，请先注册一个用户。');
    return;
  }
  console.log(`✅ 找到测试用户! UserID: ${user.id}`);

  // 3. 模拟用户同意授权，手动往数据库插一个 Authorization Code
  // (实际上这一步是由 POST /api/oauth/authorize 接口完成的)
  console.log('\n3. 模拟用户同意授权，生成 Authorization Code...');
  const code = crypto.randomBytes(32).toString('hex');
  await prisma.oAuthAuthCode.create({
    data: {
      code,
      clientId: client.clientId,
      userId: user.id,
      redirectUri: 'http://localhost:3000/callback',
      scopes: ['user:read'],
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });
  console.log(`✅ 授权码生成成功! Code: ${code}`);

  // 4. 调用 /api/oauth/token 接口换取 Access Token
  console.log('\n4. 第三方应用调用接口换取 Token...');
  const tokenResponse = await fetch('http://localhost:3000/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: client.clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: 'http://localhost:3000/callback'
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error('❌ 获取 Token 失败:', tokenData);
    return;
  }
  console.log('✅ 获取 Token 成功!');
  console.log('Access Token:', tokenData.access_token);
  console.log('Refresh Token:', tokenData.refresh_token);

  // 5. 携带 Access Token 访问受保护接口
  console.log('\n5. 携带 Access Token 访问 /api/auth/me ...');
  const meResponse = await fetch('http://localhost:3000/api/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`
    }
  });

  const meData = await meResponse.json();
  if (!meResponse.ok) {
    console.error('❌ 访问用户信息失败:', meData);
  } else {
    console.log('✅ 访问用户信息成功!');
    console.log('User Info ID:', meData.id);
  }

  // 6. 测试 Refresh Token
  console.log('\n6. 测试使用 Refresh Token 刷新...');
  const refreshResponse = await fetch('http://localhost:3000/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: client.clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refresh_token
    })
  });

  const refreshData = await refreshResponse.json();
  if (!refreshResponse.ok) {
    console.error('❌ 刷新 Token 失败:', refreshData);
  } else {
    console.log('✅ 刷新 Token 成功!');
    console.log('New Access Token:', refreshData.access_token);
  }

  // 清理数据
  await prisma.oAuthClient.delete({ where: { id: client.id } });
  console.log('\n✅ 测试结束，测试数据已清理。');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
