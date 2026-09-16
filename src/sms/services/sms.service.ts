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
import Dysmsapi20170525, { SendSmsRequest } from '@alicloud/dysmsapi20170525';
import { Config as OpenApiConfig } from '@alicloud/openapi-client';
import { RuntimeOptions } from '@alicloud/tea-util';
import { DesensitizationUtil } from '@/common/utils';
import {
  AliyunSmsConfigService,
  AliyunSmsConfigValue,
} from './aliyun-sms-config.service';

/**
 * 默认网络运行时参数：防止外部 API 偶发网络挂起阻塞 NestJS 工作线程
 */
const DEFAULT_RUNTIME_OPTIONS = new RuntimeOptions({
  connectTimeout: 3000,
  readTimeout: 5000,
});

export class SmsDeliveryError extends Error {
  constructor(
    message: string,
    readonly providerCode?: string,
  ) {
    super(message);
    this.name = 'SmsDeliveryError';
  }
}

type SmsTemplateType = 'verification' | 'securityChange';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: AliyunSmsConfigService) {}

  private cachedClient?: { key: string; client: Dysmsapi20170525 };

  /**
   * 获取阿里云客户端实例（相同 AK/SK 复用连接池，配置变更时自动创建）
   */
  getClient(configValue: AliyunSmsConfigValue): Dysmsapi20170525 {
    const cacheKey = `${configValue.accessKeyId}:${configValue.accessKeySecret}`;
    if (this.cachedClient?.key === cacheKey) {
      return this.cachedClient.client;
    }

    const client = new Dysmsapi20170525(
      new OpenApiConfig({
        accessKeyId: configValue.accessKeyId,
        accessKeySecret: configValue.accessKeySecret,
        endpoint: 'dysmsapi.aliyuncs.com',
      }),
    );
    this.cachedClient = { key: cacheKey, client };
    return client;
  }

  /**
   * 发送短信验证码
   * @param phoneNumber 手机号码
   * @param code 验证码
   */
  async sendSms(phoneNumber: string, code: string): Promise<void> {
    const config = await this.loadConfig();
    await this.deliverSms(config, phoneNumber, 'verification', { code });
  }

  /**
   * 发送账号安全变更通知短信（如手机号、邮箱换绑等安全事件）
   * @param phoneNumber 接收通知的目标手机号
   * @param contactLabel 变更的联系方式类型（如：手机号、邮箱）
   * @param newContactMasked 脱敏后的新联系方式
   * @param changedAt 变更发生的时间
   */
  async sendSecurityNotice(
    phoneNumber: string,
    contactLabel: string,
    newContactMasked: string,
    changedAt: string,
  ): Promise<void> {
    const config = await this.loadConfig();
    await this.deliverSms(config, phoneNumber, 'securityChange', {
      contactType: contactLabel,
      newContact: newContactMasked,
      changedAt,
    });
  }

  /**
   * 发送后台联调测试短信
   */
  async sendTestSms(
    phoneNumber: string,
    draftConfig?: AliyunSmsConfigValue,
  ): Promise<void> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const config = draftConfig ?? (await this.loadConfig());
    await this.deliverSms(config, phoneNumber, 'verification', { code });
  }

  /**
   * 核心发送流程：组装请求、调用 SDK、统一成功日志与异常处理
   */
  private async deliverSms(
    config: AliyunSmsConfigValue,
    phoneNumber: string,
    templateType: SmsTemplateType,
    templateParams: Record<string, string>,
  ): Promise<void> {
    const targetPhone = phoneNumber.trim().replace(/^\+?86/, '');
    const maskedPhone = DesensitizationUtil.maskPhone(targetPhone);
    const templateCode =
      templateType === 'verification'
        ? config.verificationTemplateCode
        : config.securityChangeTemplateCode;

    try {
      const sendSmsRequest = new SendSmsRequest({
        phoneNumbers: targetPhone,
        signName: config.signName,
        templateCode,
        templateParam: JSON.stringify(templateParams),
      });

      const response = await this.getClient(config).sendSmsWithOptions(
        sendSmsRequest,
        DEFAULT_RUNTIME_OPTIONS,
      );

      if (response.body?.code !== 'OK') {
        const message = response.body?.message || '短信发送失败';
        this.logger.error(
          `短信发送失败: target=${maskedPhone}, code=${response.body?.code ?? 'UNKNOWN'}, message=${message}`,
        );
        throw new SmsDeliveryError(message, response.body?.code);
      }

      this.logger.log(`短信发送成功: ${maskedPhone}`);
    } catch (error) {
      if (error instanceof SmsDeliveryError) throw error;

      const message =
        error instanceof Error ? error.message : '短信发送发生异常';
      const code = (error as { code?: string })?.code;
      this.logger.error(
        `短信发送异常: target=${maskedPhone}, code=${code ?? 'UNKNOWN'}, message=${message}`,
      );

      throw new SmsDeliveryError(message, code);
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
