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
    try {
      // 根据验证码类型选择模板
      const templateCode = this.getTemplateCode(type);
      const signName = this.getSignName();

      // 构建完整的手机号（包含国家代码）
      const fullPhoneNumber = countryCode
        ? `${countryCode}${phoneNumber}`
        : phoneNumber;

      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: fullPhoneNumber,
        signName: signName,
        templateCode: templateCode,
        templateParam: JSON.stringify({ code: code }),
      });

      const runtime = new $Util.RuntimeOptions({});

      const response = await this.client.sendSmsWithOptions(
        sendSmsRequest,
        runtime,
      );

      this.logger.log(`短信发送成功: ${fullPhoneNumber}, 验证码: ${code}`);

      // 检查响应状态
      if (response.body?.code !== 'OK') {
        const message = response.body?.message ?? '未知错误';
        throw new Error(`短信发送失败: ${message}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`短信发送失败: ${errorMessage}`);

      const typedError = error as Record<string, unknown>;
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
      throw new Error(`短信发送失败: ${errorMessage}`);
    }
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
