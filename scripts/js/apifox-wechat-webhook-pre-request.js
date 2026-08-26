// Apifox 微信小店 Webhook 前置脚本
// 引入内置的 crypto-js 库，解决 @deprecated 报错
const CryptoJS = require('crypto-js');

console.log("========== 微信小店 Webhook 加密开始 ==========");

// 1. 获取环境/全局配置（pm.variables.get 会依次查找局部、环境、全局变量）
const token = pm.variables.get("WECHAT_SHOP_WEBHOOK_TOKEN") || "";
const encodingAesKey = pm.variables.get("WECHAT_SHOP_ENCODING_AES_KEY") || "";
const appId = pm.variables.get("WECHAT_SHOP_APP_ID") || "";

console.log("正在使用的配置：", {
  "Token 长度": token.length,
  "AES Key 长度": encodingAesKey.length,
  "AppID": appId
});

// 2. 构造你要模拟测试的事件 Payload (明文 JSON)
const msgObj = {
  ToUserName: 'gh_e201bca62739',
  FromUserName: 'o9AgO5Kd5ggOC-bXrbNODIiE3bGY',
  CreateTime: Math.floor(Date.now() / 1000),
  MsgType: 'event',
  Event: 'channels_ec_order_new',
  order_info: {
    order_id: 123456789
  }
};
const msgStr = JSON.stringify(msgObj);
console.log("发送的明文 Payload:", msgObj);

// 3. 生成 16 字节的随机字符串 (使用 CryptoJS 的 WordArray)
const random16 = CryptoJS.lib.WordArray.random(16);

// 4. 构造 4 字节的消息长度，格式为大端序 (Big Endian)
const msgLen = CryptoJS.enc.Utf8.parse(msgStr).sigBytes;
const msgLenHex = msgLen.toString(16).padStart(8, '0');
const msgLenWordArray = CryptoJS.enc.Hex.parse(msgLenHex);

// 5. 构造 msg 和 appId 的 WordArray
const msgWordArray = CryptoJS.enc.Utf8.parse(msgStr);
const appIdWordArray = CryptoJS.enc.Utf8.parse(appId);

// 6. 拼接数据: 随机 16 字节 + 4 字节长度 + 明文消息 + AppID
let unpaddedWordArray = random16.clone()
  .concat(msgLenWordArray)
  .concat(msgWordArray)
  .concat(appIdWordArray);

// 7. 微信特有的 PKCS#7 填充逻辑（按 32 字节为数据块进行填充）
const blockSize = 32;
const amountToPad = blockSize - (unpaddedWordArray.sigBytes % blockSize);
const padHex = amountToPad.toString(16).padStart(2, '0');
const paddingHex = padHex.repeat(amountToPad);
const paddingWordArray = CryptoJS.enc.Hex.parse(paddingHex);

// 将 padding 追加到原来的 WordArray 末尾
const paddedWordArray = unpaddedWordArray.concat(paddingWordArray);

// 8. 准备 AES-256-CBC 加密的密钥和 IV
const aesKey = CryptoJS.enc.Base64.parse(encodingAesKey + "=");
// IV 是 AES 密钥的前 16 字节
const iv = CryptoJS.lib.WordArray.create(aesKey.words.slice(0, 4), 16);

// 9. 执行加密（设置 NoPadding）
const encrypted = CryptoJS.AES.encrypt(paddedWordArray, aesKey, {
  iv: iv,
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.NoPadding
});

// 提取加密后的 Base64 字符串
const encryptBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
console.log("生成的密文 (Encrypt 字段):", encryptBase64);

// 10. 计算 URL 参数所需的签名 (msg_signature)
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = Math.floor(Math.random() * 1000000000).toString();

// 将 encrypt、timestamp、nonce、token 进行字典序排序并拼接
const arr = [encryptBase64, timestamp, nonce, token].sort();
const strToSign = arr.join('');
// 进行 SHA1 哈希计算 (msg_signature)
const msgSignature = CryptoJS.SHA1(strToSign).toString(CryptoJS.enc.Hex);

// 计算基础签名 (signature)
const urlArr = [token, timestamp, nonce].sort();
const urlStrToSign = urlArr.join('');
const signature = CryptoJS.SHA1(urlStrToSign).toString(CryptoJS.enc.Hex);

console.log("最终请求参数：", {
  "timestamp": timestamp,
  "nonce": nonce,
  "msg_signature": msgSignature,
  "signature": signature
});

// 11. 将结果写入 Apifox 局部变量
pm.variables.set("timestamp", timestamp);
pm.variables.set("nonce", nonce);
pm.variables.set("msg_signature", msgSignature);
pm.variables.set("signature", signature);
pm.variables.set("encrypt", encryptBase64);
pm.variables.set("ToUserName", msgObj.ToUserName);
pm.variables.set("encrypt_type", "aes");

console.log("========== 变量已写入，准备发送请求 ==========");
