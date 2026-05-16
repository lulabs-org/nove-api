import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as lark from '@larksuiteoapi/node-sdk';
import { LarkClientConfig } from './types/lark-bitable.types';
import { larkConfig } from '../../configs/lark.config';

@Injectable()
export class LarkClient implements OnModuleDestroy {
  private readonly logger = new Logger(LarkClient.name);
  private client: lark.Client;

  // Expose Lark API properties directly for easier access
  public readonly bitable: lark.Client['bitable'];
  public readonly auth: lark.Client['auth'];
  public readonly drive: lark.Client['drive'];
  public readonly sheets: lark.Client['sheets'];
  public readonly docx: lark.Client['docx'];
  public readonly im: lark.Client['im'];
  public readonly calendar: lark.Client['calendar'];
  public readonly mail: lark.Client['mail'];
  public readonly contact: lark.Client['contact'];
  public readonly application: lark.Client['application'];
  public readonly admin: lark.Client['admin'];
  public readonly approval: lark.Client['approval'];
  public readonly attendance: lark.Client['attendance'];
  public readonly compensation: lark.Client['compensation'];
  public readonly corehr: lark.Client['corehr'];
  public readonly ehr: lark.Client['ehr'];
  public readonly hire: lark.Client['hire'];
  public readonly lingo: lark.Client['lingo'];
  public readonly okr: lark.Client['okr'];
  public readonly performance: lark.Client['performance'];
  public readonly task: lark.Client['task'];
  public readonly tenant: lark.Client['tenant'];
  public readonly wiki: lark.Client['wiki'];
  public readonly vc: lark.Client['vc'];
  public readonly minutes: lark.Client['minutes'];
  public readonly wsClient: lark.WSClient;

  constructor(
    @Inject(larkConfig.KEY) private readonly cfg: ConfigType<typeof larkConfig>,
  ) {
    const config: LarkClientConfig = {
      appId: this.cfg.appId || '',
      appSecret: this.cfg.appSecret || '',
      logLevel: this.cfg.logLevel || 'info',
    };

    if (!config.appId || !config.appSecret) {
      this.logger.warn(
        'Lark app credentials not configured. Please set LARK_APP_ID and LARK_APP_SECRET environment variables.',
      );
    }

    this.client = new lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
    });

    // Initialize direct API property access
    this.bitable = this.client.bitable;
    this.auth = this.client.auth;
    this.drive = this.client.drive;
    this.sheets = this.client.sheets;
    this.docx = this.client.docx;
    this.im = this.client.im;
    this.calendar = this.client.calendar;
    this.mail = this.client.mail;
    this.contact = this.client.contact;
    this.application = this.client.application;
    this.admin = this.client.admin;
    this.approval = this.client.approval;
    this.attendance = this.client.attendance;
    this.compensation = this.client.compensation;
    this.corehr = this.client.corehr;
    this.ehr = this.client.ehr;
    this.hire = this.client.hire;
    this.lingo = this.client.lingo;
    this.okr = this.client.okr;
    this.performance = this.client.performance;
    this.task = this.client.task;
    this.tenant = this.client.tenant;
    this.wiki = this.client.wiki;
    this.vc = this.client.vc;
    this.minutes = this.client.minutes;
    this.wsClient = new lark.WSClient({
      appId: config.appId,
      appSecret: config.appSecret,
    });

    this.logger.log('Lark client initialized successfully');
  }

  async onModuleDestroy() {
    if (this.wsClient) {
      this.wsClient.close();
      this.logger.log('Lark WSClient connection closed');
    }
  }

  /**
   * Test the connection to Lark API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to create a tenant access token to test credentials
      const tokenResponse = await this.client.auth.tenantAccessToken.create();
      this.logger.log('Lark connection test successful');
      return !!tokenResponse;
    } catch (error) {
      this.logger.error('Lark connection test failed', error);
      return false;
    }
  }
}
