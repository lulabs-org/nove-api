/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-02 02:48:09
 * @FilePath: /lulab_backend/src/sms/sms.service.ts
 * @Description: 短信服务
 *
 * Copyright (c) 2025 by 杨仕明 shiming.y@qq.com, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';
import { CodeType } from '@/common/enums';
import { DesensitizationUtil, formatPhoneNumber } from '@/common/utils';
import {
  AliyunSmsConfigService,
  AliyunSmsConfigValue,
} from './aliyun-sms-config.service';

export { formatPhoneNumber };

const SMS_TEST_NUMBER_LIMIT = 'isv.SMS_TEST_NUMBER_LIMIT';
const SMS_TEST_SIGN_TEMPLATE_LIMIT = 'isv.SMS_TEST_SIGN_TEMPLATE_LIMIT';

export class SmsDeliveryError extends Error {
  constructor(
    message: string,
    readonly providerCode?: string,
  ) {
    super(message);
    this.name = 'SmsDeliveryError';
  }
}

interface AliyunErrorInfo {
  providerCode?: string;
  requestId?: string;
  providerMessage?: string;
  publicMessage: string;
  recommend?: string;
}

/**
 * 解析阿里云 SMS SDK 返回的响应或异常，提取标准化排查信息与面向用户的提示
 */
export function parseAliyunSmsError(error: unknown): AliyunErrorInfo {
  const err =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : {};
  const providerCode = typeof err.code === 'string' ? err.code : undefined;
  const requestId =
    typeof err.requestId === 'string' ? err.requestId : undefined;
  const providerMessage =
    typeof err.message === 'string' ? err.message : undefined;

  let recommend: string | undefined;
  if (err.data && typeof err.data === 'object') {
    const data = err.data as Record<string, unknown>;
    if (data.Recommend) {
      recommend =
        typeof data.Recommend === 'string'
          ? data.Recommend
          : JSON.stringify(data.Recommend);
    }
  }

  let publicMessage = '短信服务暂时不可用，请稍后重试';
  if (
    providerCode === SMS_TEST_NUMBER_LIMIT ||
    (providerMessage?.includes('授权') && providerMessage.includes('手机号'))
  ) {
    publicMessage =
      '当前使用的是阿里云测试短信，只能发送给已绑定的测试手机号。请先在阿里云短信控制台绑定该号码，或改用审核通过的正式签名和模板';
  } else if (providerCode === SMS_TEST_SIGN_TEMPLATE_LIMIT) {
    publicMessage =
      '阿里云短信签名与模板类型不匹配。请检查平台治理中的阿里云短信签名和验证码模板配置';
  }

  return { providerCode, requestId, providerMessage, publicMessage, recommend };
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: AliyunSmsConfigService) {}

  /**
   * 创建阿里云短信客户端（保留实例方法以便单元测试 mock）
   */
  createClient(configValue: AliyunSmsConfigValue): Dysmsapi20170525 {
    const config = new $OpenApi.Config({
      accessKeyId: configValue.accessKeyId,
      accessKeySecret: configValue.accessKeySecret,
      endpoint: 'dysmsapi.aliyuncs.com',
    });
    return new Dysmsapi20170525(config);
  }

  /**
   * 发送短信验证码
   * @param phoneNumber 手机号码
   * @param code 验证码
   * @param _type 验证码类型（保留入参以兼容调用签名，所有验证码共用同一模板）
   * @param countryCode 国家代码（可选）
   */
  async sendSms(
    phoneNumber: string,
    code: string,
    _type?: CodeType,
    countryCode?: string,
  ): Promise<void> {
    const config = await this.loadConfig();
    await this.deliverSms(
      config,
      phoneNumber,
      countryCode,
      config.verificationTemplateCode,
      { code },
    );
  }

  async sendSecurityChangeNotice(
    phoneNumber: string,
    countryCode: string,
    contactLabel: string,
    newContactMasked: string,
    changedAt: string,
  ): Promise<void> {
    const config = await this.loadConfig();
    await this.deliverSms(
      config,
      phoneNumber,
      countryCode,
      config.securityChangeTemplateCode,
      {
        contactType: contactLabel,
        newContact: newContactMasked,
        changedAt,
      },
    );
  }

  /**
   * 发送后台联调测试短信
   */
  async sendTestSms(
    phoneNumber: string,
    countryCode?: string,
    draftConfig?: AliyunSmsConfigValue,
  ): Promise<void> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const config = draftConfig ?? (await this.loadConfig());
    await this.deliverSms(
      config,
      phoneNumber,
      countryCode,
      config.verificationTemplateCode,
      { code },
    );
  }

  /**
   * 核心发送流程：组装请求、调用 SDK、统一成功日志与异常处理
   */
  private async deliverSms(
    config: AliyunSmsConfigValue,
    phoneNumber: string,
    countryCode: string | undefined,
    templateCode: string,
    templateParams: Record<string, string>,
  ): Promise<void> {
    const fullPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
    try {
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: fullPhoneNumber,
        signName: config.signName,
        templateCode,
        templateParam: JSON.stringify(templateParams),
      });

      const runtime = new $Util.RuntimeOptions({});
      const response = await this.createClient(config).sendSmsWithOptions(
        sendSmsRequest,
        runtime,
      );

      if (response.body?.code !== 'OK') {
        const { providerCode, requestId, publicMessage, recommend } =
          parseAliyunSmsError(response.body);
        this.logDeliveryFailure(
          fullPhoneNumber,
          providerCode,
          requestId,
          recommend,
        );
        throw new SmsDeliveryError(publicMessage, providerCode);
      }

      this.logger.log(
        `短信发送成功: ${DesensitizationUtil.maskPhone(fullPhoneNumber)}`,
      );
    } catch (error) {
      if (error instanceof SmsDeliveryError) throw error;

      const { providerCode, requestId, publicMessage, recommend } =
        parseAliyunSmsError(error);
      this.logDeliveryFailure(
        fullPhoneNumber,
        providerCode,
        requestId,
        recommend,
      );

      throw new SmsDeliveryError(publicMessage, providerCode);
    }
  }

  private logDeliveryFailure(
    phoneNumber: string,
    providerCode?: string,
    requestId?: string,
    recommend?: string,
  ): void {
    this.logger.error(
      `短信发送失败: target=${DesensitizationUtil.maskPhone(phoneNumber)}, code=${providerCode ?? 'UNKNOWN'}, requestId=${requestId ?? 'UNKNOWN'}`,
    );
    if (recommend) {
      this.logger.error(`诊断地址: ${recommend}`);
    }
  }

  private async loadConfig(): Promise<AliyunSmsConfigValue> {
    try {
      return await this.configService.getRequiredConfig();
    } catch {
      throw new SmsDeliveryError('短信服务尚未配置', 'SMS_NOT_CONFIGURED');
    }
  }
}
