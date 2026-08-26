/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-20 08:48:13
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-20 08:53:57
 * @FilePath: /lulab_backend/docs/developer/modules/hook-tencent-mtg/tencent-meeting-webhook-postman-pre-script.js
 * @Description: 
 * 
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved. 
 */
// 腾讯会议Webhook URL验证 - Postman前置脚本 
// 用于测试 /webhooks/tencent GET 端点 

const CryptoJS = require('crypto-js'); 

// 配置参数 - 请根据您的实际配置修改这些值 
const config = { 
    // 腾讯会议Webhook配置 
    token: pm.environment.get("TENCENT_MEETING_TOKEN") || "your_webhook_token_here", 
    encodingAesKey: pm.environment.get("TENCENT_MEETING_ENCODING_AES_KEY") || "your_encoding_aes_key_here", 

    // 生成随机参数 
    timestamp: Date.now().toString(), 
    nonce: Math.floor(10000000 + Math.random() * 90000000).toString(), 

    // 测试用的验证字符串（明文） 
    verificationText: "testverification" 
}; 

// 计算签名的函数 
function calculateSignature(token, timestamp, nonce, data) { 
    // 按字典序排序参数 
    const params = [token, timestamp, nonce, data].sort(); 
    const concatenatedString = params.join(''); 

    // 计算SHA1哈希 
    const signature = CryptoJS.SHA1(concatenatedString).toString(); 
    return signature; 
} 

// 腾讯会议兼容的AES加密函数 
function encryptTextTencentStyle(plainText, encodingAesKey) { 
    try { 
        // 1. 解码EncodingAESKey（添加"="填充） 
        const decodedKey = CryptoJS.enc.Base64.parse(encodingAesKey + '='); 
        
        // 2. 从密钥的前16字节提取IV 
        const iv = CryptoJS.lib.WordArray.create(decodedKey.words.slice(0, 4)); // 16字节 = 4个32位字 
        
        // 3. 使用AES-256-CBC加密 
        const encrypted = CryptoJS.AES.encrypt(plainText, decodedKey, { 
            iv: iv, 
            mode: CryptoJS.mode.CBC, 
            padding: CryptoJS.pad.Pkcs7 
        }); 
        
        return encrypted.toString(); 
    } catch (error) { 
        console.error("加密失败:", error); 
        return null; 
    } 
} 

// 生成加密的验证字符串 
const checkStr = encryptTextTencentStyle(config.verificationText, config.encodingAesKey); 

if (!checkStr) { 
    console.error("加密失败，无法继续"); 
    return; 
} 

// 计算签名（使用原始Base64字符串，不进行URL编码）
const signature = calculateSignature(config.token, config.timestamp, config.nonce, checkStr); 

// 对check_str进行URL编码，模拟腾讯会议的实际行为
// 这确保了Base64中的特殊字符（如+、/、=）在URL中正确传输
const urlEncodedCheckStr = encodeURIComponent(checkStr);

// 设置环境变量，以便在请求中使用 
pm.environment.set("timestamp", config.timestamp); 
pm.environment.set("nonce", config.nonce); 
pm.environment.set("signature", signature); 
pm.environment.set("check_str", urlEncodedCheckStr); // 使用URL编码后的字符串

const { token, encodingAesKey } = config; 
console.log("token:",token); 
console.log("encodingAesKey:",encodingAesKey); 

console.log("腾讯会议Webhook URL验证参数已生成:"); 
console.log("时间戳:", config.timestamp); 
console.log("随机数:", config.nonce); 
console.log("验证字符串(明文):", config.verificationText); 
console.log("验证字符串(加密):", checkStr); 
console.log("URL编码后的验证字符串:", urlEncodedCheckStr);
console.log("签名:", signature);