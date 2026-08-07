/**
 * 微信小店 Webhook 事件本地测试脚本
 * 
 * 作用：
 * 该脚本用于在本地开发环境中，模拟微信服务器向本地 Webhook 接口发送事件推送请求。
 * 它会自动根据 `.env` 中的配置，将明文的事件 JSON 加密，并计算签名，生成完全符合微信规范的 POST 请求。
 * 
 * 使用方法：
 * 1. 确保 `.env` 文件中配置了以下环境变量：
 *    - WECHAT_SHOP_WEBHOOK_TOKEN
 *    - WECHAT_SHOP_ENCODING_AES_KEY
 *    - WECHAT_SHOP_APP_ID
 * 2. 确保本地的 NestJS 服务正在运行（例如使用 pnpm start:dev，默认监听 3000 端口）。
 * 3. 运行本脚本：node scripts/test-wechat-webhook.js
 * 
 * 修改事件内容：
 * 如果你需要测试其他类型的事件推送，只需修改脚本中 `const msg = JSON.stringify({ ... })` 的内容，
 * 将其替换为你想要测试的事件 Payload（明文），脚本会自动完成加密并发送请求。
 */
const crypto = require('crypto');
const http = require('http');
require('dotenv').config();

const token = process.env.WECHAT_SHOP_WEBHOOK_TOKEN;
const encodingAesKey = process.env.WECHAT_SHOP_ENCODING_AES_KEY;
const appId = process.env.WECHAT_SHOP_APP_ID;

if (!token || !encodingAesKey || !appId) {
  console.error('Missing env vars');
  process.exit(1);
}

const msg = JSON.stringify({
  ToUserName: 'gh_e201bca62739',
  FromUserName: 'o9AgO5Kd5ggOC-bXrbNODIiE3bGY',
  CreateTime: Math.floor(Date.now() / 1000),
  MsgType: 'event',
  Event: 'channels_ec_order_new',
  order_info: {
    order_id: 123456789
  }
});

const random16 = crypto.randomBytes(16);
const msgBuffer = Buffer.from(msg, 'utf8');
const msgLenBuffer = Buffer.alloc(4);
msgLenBuffer.writeUInt32BE(msgBuffer.length, 0);
const appIdBuffer = Buffer.from(appId, 'utf8');

const unpaddedBuf = Buffer.concat([random16, msgLenBuffer, msgBuffer, appIdBuffer]);

// PKCS#7 pad to 32 bytes
const blockSize = 32;
const amountToPad = blockSize - (unpaddedBuf.length % blockSize);
const padBuffer = Buffer.alloc(amountToPad, amountToPad);
const paddedBuf = Buffer.concat([unpaddedBuf, padBuffer]);

const aesKey = Buffer.from(encodingAesKey + '=', 'base64');
const iv = aesKey.subarray(0, 16);

const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
cipher.setAutoPadding(false);

let encryptedBuf = cipher.update(paddedBuf);
encryptedBuf = Buffer.concat([encryptedBuf, cipher.final()]);

const encrypt = encryptedBuf.toString('base64');

const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = Math.floor(Math.random() * 1000000000).toString();

const arr = [encrypt, timestamp, nonce, token].sort();
const str = arr.join('');
const msgSignature = crypto.createHash('sha1').update(str).digest('hex');

const body = JSON.stringify({
  ToUserName: 'gh_e201bca62739',
  Encrypt: encrypt
});

console.log('Sending request to http://localhost:3000/webhooks/wechat-shop/events...');
console.log('Timestamp:', timestamp);
console.log('Nonce:', nonce);
console.log('Signature:', msgSignature);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/webhooks/wechat-shop/events?timestamp=${timestamp}&nonce=${nonce}&msg_signature=${msgSignature}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('BODY:', chunk);
  });
});

req.on('error', (e) => {
  console.error('Problem with request:', e.message);
});

req.write(body);
req.end();

console.log('\nEquivalent curl command:\n');
console.log(`curl -X POST "http://localhost:3000/webhooks/wechat-shop/events?timestamp=${timestamp}&nonce=${nonce}&msg_signature=${msgSignature}" \\
-H "Content-Type: application/json" \\
-d '${body}'`);
