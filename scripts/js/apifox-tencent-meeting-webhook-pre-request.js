/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-20 08:48:13
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 00:15:13
 * @FilePath: /lulab_backend/docs/developer/integrations/tencent-meeting/scripts/post-event-postman-pre-script.js
 * @Description: 腾讯会议Webhook事件POST请求 - Postman前置脚本
 * // 腾讯会议Webhook事件POST请求 - Postman前置脚本 
 * // 用于测试 /webhooks/tencent POST 端点 
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved. 
 */


const CryptoJS = require('crypto-js');

const config = {
    token: pm.environment.get("TENCENT_MEETING_TOKEN") || "your_webhook_token_here",
    encodingAesKey: pm.environment.get("TENCENT_MEETING_ENCODING_AES_KEY") || "your_encoding_aes_key_here",
    timestamp: Date.now().toString(),
    nonce: Math.floor(10000000 + Math.random() * 90000000).toString(),
    eventType: pm.environment.get("TENCENT_MEETING_EVENT_TYPE") || "meeting.end"
};

function calculateSignature(token, timestamp, nonce, data) {
    const params = [token, timestamp, nonce, data].sort();
    const concatenatedString = params.join('');
    const signature = CryptoJS.SHA1(concatenatedString).toString();
    return signature;
}

function encryptTextTencentStyle(plainText, encodingAesKey) {
    try {
        const decodedKey = CryptoJS.enc.Base64.parse(encodingAesKey + '=');
        const iv = CryptoJS.lib.WordArray.create(decodedKey.words.slice(0, 4));
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

function generateTestEvent(eventType) {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const currentTimestampMs = Date.now();

    const baseCreator = {
        userid: "woa_test_user_001",
        user_name: "测试用户",
        uuid: "test-uuid-001",
        instance_id: "1",
        ms_open_id: "test-ms-open-id-001"
    };

    const baseMeetingInfo = {
        meeting_id: "1234567890123456789",
        meeting_code: "123456789",
        subject: "测试会议主题",
        creator: baseCreator,
        meeting_type: 0,
        start_time: currentTimestamp - 3600,
        end_time: currentTimestamp + 3600,
        meeting_create_mode: 1,
        media_set_type: 1
    };

    const baseOperator = {
        userid: "test_operator_001",
        user_name: "操作用户",
        uuid: "operator-uuid-001",
        instance_id: "2",
        ms_open_id: "operator-ms-open-id-001"
    };

    const baseEvent = {
        event: eventType,
        trace_id: "trace_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        payload: []
    };

    switch (eventType) {
        case "meeting.end":
            baseEvent.payload.push({
                operate_time: currentTimestampMs,
                operator: baseOperator,
                meeting_info: {
                    ...baseMeetingInfo,
                    meeting_create_from: 1
                },
                meeting_end_type: 0
            });
            break;

        case "meeting.participant-joined":
            baseEvent.payload.push({
                operate_time: currentTimestampMs,
                operator: baseOperator,
                meeting_info: {
                    ...baseMeetingInfo,
                    meeting_create_from: 1,
                    meeting_id_type: 0,
                    action_scene_type: 0
                }
            });
            break;

        case "meeting.participant-left":
            baseEvent.payload.push({
                operate_time: currentTimestampMs,
                operator: baseOperator,
                meeting_info: {
                    ...baseMeetingInfo,
                    meeting_create_from: 1,
                    meeting_id_type: 0,
                    action_scene_type: 0
                }
            });
            break;

        case "recording.completed":
            baseEvent.payload.push({
                operate_time: currentTimestampMs,
                operator: {
                    instance_id: "2"
                },
                meeting_info: {
                    ...baseMeetingInfo,
                    creator: {
                        ...baseCreator,
                        uuid: "creator-uuid-002"
                    },
                    sub_meeting_id: currentTimestamp.toString(),
                    start_time: currentTimestamp - 3600,
                    end_time: currentTimestamp - 3000,
                    sub_meeting_start_time: currentTimestamp - 3600,
                    sub_meeting_end_time: currentTimestamp - 3000,
                    meeting_id_type: 0
                },
                recording_files: [
                    {
                        record_file_id: "2005979751095140353"
                    }
                ]
            });
            break;

        case "smart.transcripts":
            baseEvent.payload.push({
                operate_time: currentTimestamp,
                meeting_info: baseMeetingInfo,
                recording_files: [
                    {
                        record_file_id: "2005979751095140353",
                        lang: "zh"
                    }
                ]
            });
            break;

        case "smart.fullsummary":
            baseEvent.payload.push({
                operate_time: currentTimestamp,
                meeting_info: baseMeetingInfo,
                recording_files: [
                    {
                        record_file_id: "2005979751095140353",
                        lang: "zh"
                    }
                ]
            });
            baseEvent.result = 1;
            break;

        default:
            baseEvent.payload.push({
                operate_time: currentTimestampMs,
                operator: baseOperator,
                meeting_info: baseMeetingInfo
            });
    }

    return JSON.stringify(baseEvent);
}

const eventData = generateTestEvent(config.eventType);

const encryptedData = encryptTextTencentStyle(eventData, config.encodingAesKey);

if (!encryptedData) {
    console.error("加密失败，无法继续");
    return;
}

const signature = calculateSignature(config.token, config.timestamp, config.nonce, encryptedData);

pm.environment.set("timestamp", config.timestamp);
pm.environment.set("nonce", config.nonce);
pm.environment.set("signature", signature);
pm.environment.set("encrypted_data", encryptedData);

const { token, encodingAesKey } = config;
console.log("token:", token);
console.log("encodingAesKey:", encodingAesKey);

console.log("腾讯会议Webhook事件POST请求参数已生成:");
console.log("事件类型:", config.eventType);
console.log("时间戳:", config.timestamp);
console.log("随机数:", config.nonce);
console.log("事件数据(明文):", eventData);
console.log("事件数据(加密):", encryptedData);
console.log("签名:", signature);