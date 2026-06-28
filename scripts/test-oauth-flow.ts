/**
 * OAuth 全链路自动化测试脚本
 * 
 * 用途:
 * 模拟完整的 OAuth2 授权码模式 (Authorization Code Grant) 流程：
 * 1. 模拟用户登录，获取系统的 AccessToken。
 * 2. 携带 AccessToken，调用授权端点颁发授权码 (Code)。
 * 3. 模拟第三方应用后端使用 Code 换取专属于该第三方应用的 AccessToken 和 RefreshToken。
 * 4. 模拟第三方应用使用 RefreshToken 刷新访问令牌。
 * 
 * 前置条件:
 * 1. 必须先运行 npx tsx scripts/test-oauth-setup.ts，以在数据库中生成测试用的用户和客户端数据。
 * 2. 确保你的后端服务正在运行中（默认 http://localhost:3000）。
 * 
 * 运行方式:
 * npx tsx scripts/test-oauth-flow.ts
 */

import axios from 'axios';

async function runTest() {
  const BASE_URL = 'http://localhost:3000/api';

  try {
    // ----------------------------------------------------------------------
    // 第一步：模拟用户在系统中登录
    // 这是为了获取当前用户的凭证。OAuth 的授权步骤必须在用户已登录的状态下进行。
    // ----------------------------------------------------------------------
    console.log('--- 1. Login (模拟系统用户登录) ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      type: 'email_password',
      email: 'curl_test@example.com',
      password: 'password123',
      clientType: 'app'
    });
    // 获取用户的 Bearer Token
    const userAccessToken = loginRes.data.accessToken;
    console.log('✅ 登录成功, 获取到用户 accessToken:', userAccessToken.substring(0, 20) + '...');

    // ----------------------------------------------------------------------
    // 第二步：同意授权并生成授权码 (Authorization Code)
    // 这一步模拟了用户在前端页面点击“同意授权”按钮后，前端向后端的请求。
    // 请求成功后，后端会返回一个带有 code 参数的重定向地址。
    // ----------------------------------------------------------------------
    console.log('\n--- 2. Get Authorization Code (同意授权) ---');
    const authRes = await axios.post(`${BASE_URL}/oauth/authorize`, {
      response_type: 'code',
      client_id: 'curl-test-client',
      redirect_uri: 'http://localhost:3000/callback',
      scope: 'read'
    }, {
      // 必须携带刚登录获取的用户 Token
      headers: { Authorization: `Bearer ${userAccessToken}` } 
    });
    console.log('✅ 授权成功, 后端返回数据:', authRes.data);
    
    // 从重定向的 URI 中提取生成的 code 参数
    const redirectUri = new URL(authRes.data.redirect_uri);
    const code = redirectUri.searchParams.get('code');
    console.log('👉 提取出的 code:', code);

    // ----------------------------------------------------------------------
    // 第三步：第三方应用使用 Code 换取 AccessToken
    // 这一步是由第三方应用的服务器后台直接调用你的后台接口完成的，不是由前端发起的。
    // 它使用刚拿到手的 code 以及 client_secret 来证明自己的身份。
    // ----------------------------------------------------------------------
    console.log('\n--- 3. Exchange Code for Token (Code 换 Token) ---');
    const tokenRes = await axios.post(`${BASE_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: 'curl-test-client',
      client_secret: 'curl-test-secret',
      code: code,
      redirect_uri: 'http://localhost:3000/callback'
    });
    console.log('✅ Token 交换成功, 返回数据:', tokenRes.data);

    // 保存返回的 refreshToken 用于第四步
    const refreshToken = tokenRes.data.refresh_token;

    // ----------------------------------------------------------------------
    // 第四步：使用 Refresh Token 刷新 AccessToken
    // 第三方应用的 AccessToken 过期后，可以使用 refreshToken 来换取新的 Token。
    // ----------------------------------------------------------------------
    console.log('\n--- 4. Refresh Token (刷新 Token) ---');
    const refreshRes = await axios.post(`${BASE_URL}/oauth/token`, {
      grant_type: 'refresh_token',
      client_id: 'curl-test-client',
      client_secret: 'curl-test-secret',
      refresh_token: refreshToken
    });
    console.log('✅ Token 刷新成功, 返回新的 Token 数据:', refreshRes.data);

    console.log('\n🎉 所有 OAuth 测试链路已成功跑通！');
  } catch (error: any) {
    console.error('\n❌ 测试失败:');
    if (error.response) {
      // 如果是有响应包的 HTTP 错误，打印出具体的错误状态和信息
      console.error(`HTTP Status: ${error.response.status}`);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTest();
