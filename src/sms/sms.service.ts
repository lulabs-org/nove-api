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

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';
import Credential from '@alicloud/credentials';
import { CodeType } from '../common/enums';
import { aliyunConfig } from '../configs/aliyun.config';

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
  private client: Dysmsapi20170525;

  constructor(
    @Inject(aliyunConfig.KEY)
    private readonly cfg: ConfigType<typeof aliyunConfig>,
  ) {
    this.client = this.createClient();
  }

  /**
   * 创建阿里云短信客户端
   */
  private createClient(): Dysmsapi20170525 {
    const credential = new Credential();
    const config = new $OpenApi.Config({
      credential: credential,
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
    const templateCode = this.getTemplateCode(type);
    await this.deliverSms(phoneNumber, countryCode, templateCode, { code });
  }

  async sendSecurityChangeNotice(
    phoneNumber: string,
    countryCode: string,
    contactLabel: string,
    newContactMasked: string,
    changedAt: string,
  ): Promise<void> {
    const templateCode = this.cfg.sms.templates.securityChange;
    if (!templateCode) {
      throw new SmsDeliveryError(
        '安全通知短信模板未配置',
        'SECURITY_CHANGE_TEMPLATE_MISSING',
      );
    }
    await this.deliverSms(phoneNumber, countryCode, templateCode, {
      contactType: contactLabel,
      newContact: newContactMasked,
      changedAt,
    });
  }

  private async deliverSms(
    phoneNumber: string,
    countryCode: string | undefined,
    templateCode: string,
    templateParams: Record<string, string>,
  ): Promise<void> {
    const fullPhoneNumber = this.formatPhoneNumber(phoneNumber, countryCode);
    try {
      const signName = this.getSignName();

      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: fullPhoneNumber,
        signName: signName,
        templateCode: templateCode,
        templateParam: JSON.stringify(templateParams),
      });

      const runtime = new $Util.RuntimeOptions({});

      const response = await this.client.sendSmsWithOptions(
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
      return '阿里云短信签名与模板类型不匹配。测试签名必须搭配测试模板；正式签名必须搭配审核通过的正式模板，请检查 ALIYUN_SMS_SIGN_NAME 和 ALIYUN_SMS_TEMPLATE_LOGIN';
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
  private getTemplateCode(type: CodeType): string {
    const templateMap = {
      [CodeType.REGISTER]: this.cfg.sms.templates.register,
      [CodeType.LOGIN]: this.cfg.sms.templates.login,
      [CodeType.RESET_PASSWORD]: this.cfg.sms.templates.resetPassword,
      [CodeType.IDENTITY_CONFIRM]: this.cfg.sms.templates.login,
      [CodeType.CHANGE_EMAIL]: this.cfg.sms.templates.login,
      [CodeType.CHANGE_PHONE]: this.cfg.sms.templates.login,
    } as const;
    return templateMap[type];
  }

  /**
   * 获取短信签名
   * 注意：签名需要在阿里云控制台中预先配置并审核通过
   */
  private getSignName(): string {
    return this.cfg.sms.signName;
  }
}
