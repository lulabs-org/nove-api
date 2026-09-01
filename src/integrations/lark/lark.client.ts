import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as lark from '@larksuiteoapi/node-sdk';
import { LarkClientConfig } from './types/lark-bitable.types';
import {
  SingleOrgContextService,
  SystemConfigChangeEvent,
  SystemConfigService,
} from '@/admin/system-config/services';
import { OnEvent } from '@nestjs/event-emitter';
import { SystemConfigValues } from '@/admin/system-config/registries/system-config.registry';

@Injectable()
export class LarkClient implements OnModuleInit {
  private readonly logger = new Logger(LarkClient.name);
  private client: lark.Client;

  // Expose Lark API properties directly for easier access
  public bitable: lark.Client['bitable'];
  public auth: lark.Client['auth'];
  public drive: lark.Client['drive'];
  public sheets: lark.Client['sheets'];
  public docx: lark.Client['docx'];
  public im: lark.Client['im'];
  public calendar: lark.Client['calendar'];
  public mail: lark.Client['mail'];
  public contact: lark.Client['contact'];
  public application: lark.Client['application'];
  public admin: lark.Client['admin'];
  public approval: lark.Client['approval'];
  public attendance: lark.Client['attendance'];
  public compensation: lark.Client['compensation'];
  public corehr: lark.Client['corehr'];
  public ehr: lark.Client['ehr'];
  public hire: lark.Client['hire'];
  public lingo: lark.Client['lingo'];
  public okr: lark.Client['okr'];
  public performance: lark.Client['performance'];
  public task: lark.Client['task'];
  public tenant: lark.Client['tenant'];
  public wiki: lark.Client['wiki'];
  public vc: lark.Client['vc'];
  public minutes: lark.Client['minutes'];
  public wsClient: lark.WSClient;

  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly orgContext: SingleOrgContextService,
  ) {
    const config: LarkClientConfig = {
      appId: '',
      appSecret: '',
      logLevel: 'info',
    };

    if (!config.appId || !config.appSecret) {
      this.logger.warn('Lark app credentials are not configured.');
    }

    this.client = new lark.Client(config);

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

  async onModuleInit() {
    const { value } = await this.systemConfigService.getEffectiveConfig(
      this.orgContext.getOrgId(),
      'lark',
    );
    this.applyHttpConfig(value);
    this.wsClient = new lark.WSClient({
      appId: String(value.appId ?? ''),
      appSecret: String(value.appSecret ?? ''),
    });
  }

  @OnEvent('config.lark.updated')
  handleConfigUpdated(event: SystemConfigChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    this.applyHttpConfig(event.value);
  }

  @OnEvent('config.lark.deleted')
  handleConfigDeleted(event: SystemConfigChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    this.applyHttpConfig(event.value);
  }

  private applyHttpConfig(value: SystemConfigValues) {
    this.client = new lark.Client({
      appId: String(value.appId ?? ''),
      appSecret: String(value.appSecret ?? ''),
    });
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
