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
import { CodeType } from '../common/enums';
import {
  AliyunSmsConfigService,
  AliyunSmsConfigValue,
} from './aliyun-sms-config.service';

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

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: AliyunSmsConfigService) {}

  /**
   * 创建阿里云短信客户端
   */
  private createClient(configValue: AliyunSmsConfigValue): Dysmsapi20170525 {
    const config = new $OpenApi.Config({
      accessKeyId: configValue.accessKeyId,
      accessKeySecret: configValue.accessKeySecret,
    });
    // Endpoint 请参考 https://api.aliyun.com/product/Dysmsapi
    config.endpoint = 'dysmsapi.aliyuncs.com';
    return new Dysmsapi20170525(config);
  }

  /**
   * 发送短信验证码
   * @param phoneNumber 手机号码
   * @param code 验证码
   * @param type 验证码类型
   * @param countryCode 国家代码（可选）
   */
  async sendSms(
    phoneNumber: string,
    code: string,
    type: CodeType,
    countryCode?: string,
  ): Promise<void> {
    const config = await this.loadConfig();
    const templateCode = this.getTemplateCode(type, config);
    await this.deliverSms(config, phoneNumber, countryCode, templateCode, {
      code,
    });
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
      config.loginTemplateCode,
      { code },
    );
  }

  private async deliverSms(
    config: AliyunSmsConfigValue,
    phoneNumber: string,
    countryCode: string | undefined,
    templateCode: string,
    templateParams: Record<string, string>,
  ): Promise<void> {
    const fullPhoneNumber = this.formatPhoneNumber(phoneNumber, countryCode);
    try {
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: fullPhoneNumber,
        signName: config.signName,
        templateCode: templateCode,
        templateParam: JSON.stringify(templateParams),
      });

      const runtime = new $Util.RuntimeOptions({});

      const response = await this.createClient(config).sendSmsWithOptions(
        sendSmsRequest,
        runtime,
      );

      // 检查响应状态
      if (response.body?.code !== 'OK') {
        const providerCode = response.body?.code;
        this.logDeliveryFailure(
          fullPhoneNumber,
          providerCode,
          response.body?.requestId,
        );
        throw new SmsDeliveryError(
          this.toPublicErrorMessage(providerCode, response.body?.message),
          providerCode,
        );
      }
      this.logger.log(`短信发送成功: ${this.maskPhoneNumber(fullPhoneNumber)}`);
    } catch (error) {
      if (error instanceof SmsDeliveryError) throw error;

      const typedError = error as Record<string, unknown>;
      const providerCode =
        typeof typedError?.code === 'string' ? typedError.code : undefined;
      const requestId =
        typeof typedError?.requestId === 'string'
          ? typedError.requestId
          : undefined;
      const providerMessage =
        typeof typedError?.message === 'string'
          ? typedError.message
          : undefined;
      this.logDeliveryFailure(fullPhoneNumber, providerCode, requestId);
      if (typedError?.data && typeof typedError.data === 'object') {
        const data = typedError.data as Record<string, unknown>;
        if (data?.Recommend) {
          const recommend = data.Recommend as unknown;
          const recommendStr =
            typeof recommend === 'string'
              ? recommend
              : JSON.stringify(recommend);
          this.logger.error(`诊断地址: ${recommendStr}`);
        }
      }
      throw new SmsDeliveryError(
        this.toPublicErrorMessage(providerCode, providerMessage),
        providerCode,
      );
    }
  }

  private toPublicErrorMessage(
    providerCode?: string,
    providerMessage?: string,
  ): string {
    if (
      providerCode === SMS_TEST_NUMBER_LIMIT ||
      (providerMessage?.includes('授权') && providerMessage.includes('手机号'))
    ) {
      return '当前使用的是阿里云测试短信，只能发送给已绑定的测试手机号。请先在阿里云短信控制台绑定该号码，或改用审核通过的正式签名和模板';
    }
    if (providerCode === SMS_TEST_SIGN_TEMPLATE_LIMIT) {
      return '阿里云短信签名与模板类型不匹配。请检查平台治理中的阿里云短信签名和登录模板配置';
    }
    return '短信服务暂时不可用，请稍后重试';
  }

  private logDeliveryFailure(
    phoneNumber: string,
    providerCode?: string,
    requestId?: string,
  ): void {
    this.logger.error(
      `短信发送失败: target=${this.maskPhoneNumber(phoneNumber)}, code=${providerCode ?? 'UNKNOWN'}, requestId=${requestId ?? 'UNKNOWN'}`,
    );
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 7) return '***';
    return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`;
  }

  private formatPhoneNumber(phoneNumber: string, countryCode?: string): string {
    const normalizedCountryCode = countryCode?.trim();
    if (
      !normalizedCountryCode ||
      normalizedCountryCode === '+86' ||
      normalizedCountryCode === '86' ||
      normalizedCountryCode === '0086'
    ) {
      return phoneNumber;
    }
    return `${normalizedCountryCode.replace(/^\+/, '')}${phoneNumber}`;
  }

  /**
   * 根据验证码类型获取短信模板代码
   * 注意：这些模板代码需要在阿里云控制台中预先配置
   */
  private getTemplateCode(
    type: CodeType,
    config: AliyunSmsConfigValue,
  ): string {
    const templateMap = {
      [CodeType.REGISTER]: config.registerTemplateCode,
      [CodeType.LOGIN]: config.loginTemplateCode,
      [CodeType.RESET_PASSWORD]: config.resetPasswordTemplateCode,
      [CodeType.IDENTITY_CONFIRM]: config.loginTemplateCode,
      [CodeType.CHANGE_EMAIL]: config.loginTemplateCode,
      [CodeType.CHANGE_PHONE]: config.loginTemplateCode,
    } as const;
    return templateMap[type];
  }

  private async loadConfig(): Promise<AliyunSmsConfigValue> {
    try {
      return await this.configService.getRequiredConfig();
    } catch {
      throw new SmsDeliveryError('短信服务尚未配置', 'SMS_NOT_CONFIGURED');
    }
  }
}
