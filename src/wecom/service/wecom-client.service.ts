import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { wecomConfig, WecomConfig } from '@/configs/wecom.config';
import { WecomExternalContactResponse } from '../types';
import { WecomTokenService } from './wecom-token.service';

@Injectable()
export class WecomClientService {
  private readonly logger = new Logger(WecomClientService.name);
  private readonly baseUrl: string;

  constructor(
    @Inject(wecomConfig.KEY) private readonly config: WecomConfig,
    private readonly httpService: HttpService,
    private readonly wecomTokenService: WecomTokenService,
  ) {
    this.baseUrl = this.config.apiBaseUrl;
  }

  /**
   * 获取客户详情
   * https://developer.work.weixin.qq.com/document/path/92114
   *
   * @param externalUserId 外部联系人的userid
   * @param cursor 分页 cursor（当跟进人多于500人时需要）
   */
  async getExternalContact(
    externalUserId: string,
    cursor?: string,
  ): Promise<WecomExternalContactResponse> {
    const accessToken = await this.wecomTokenService.getAccessToken();

    const { data } = await firstValueFrom(
      this.httpService.get<WecomExternalContactResponse>(
        `${this.baseUrl}/cgi-bin/externalcontact/get`,
        {
          params: {
            access_token: accessToken,
            external_userid: externalUserId,
            cursor,
          },
        },
      ),
    ).catch((e: AxiosError) => {
      this.logger.error('WeCom API error (getExternalContact):', e.message);
      throw new ServiceUnavailableException(
        `WeCom API request failed: ${e.response?.status}`,
      );
    });

    if (data.errcode !== 0) {
      this.logger.error(
        `WeCom API error (getExternalContact): ${data.errcode} ${data.errmsg}`,
      );
      throw new ServiceUnavailableException(
        `WeCom API error: ${data.errcode} ${data.errmsg}`,
      );
    }

    return data;
  }
}
