// Apifox 微信小店 Webhook URL 验证 (GET) 前置脚本
const CryptoJS = require('crypto-js');

console.log("========== 微信小店 Webhook URL 验证准备 ==========");

// 1. 获取环境/全局配置的 Token
const token = pm.variables.get("WECHAT_SHOP_WEBHOOK_TOKEN") || "";

if (!token) {
    console.warn("未获取到 WECHAT_SHOP_WEBHOOK_TOKEN，将使用空字符串进行签名");
}

// 2. 生成随机参数
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = Math.floor(Math.random() * 1000000000).toString();

// echostr 是一段随机字符串，微信要求后端原样返回
const echostr = "random_echo_string_" + Math.random().toString(36).substring(2, 10);

// 3. 计算基础签名 (signature)
// 将 token, timestamp, nonce 放入数组，进行字典序排序后拼接
const urlArr = [token, timestamp, nonce].sort();
const urlStrToSign = urlArr.join('');

// 进行 SHA1 哈希计算
const signature = CryptoJS.SHA1(urlStrToSign).toString(CryptoJS.enc.Hex);

console.log("最终请求参数：", {
  "signature": signature,
  "timestamp": timestamp,
  "nonce": nonce,
  "echostr": echostr
});

// 4. 将结果写入 Apifox 局部变量
pm.variables.set("signature", signature);
pm.variables.set("timestamp", timestamp);
pm.variables.set("nonce", nonce);
pm.variables.set("echostr", echostr);

console.log("========== URL 验证变量已写入 ==========");
