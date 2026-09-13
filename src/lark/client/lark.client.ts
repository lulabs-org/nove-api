import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as lark from '@larksuiteoapi/node-sdk';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IntegrationChangeEvent,
  INTEGRATION_EVENT_PATTERNS,
  IntegrationsService,
  IntegrationValues,
} from '@/admin/integrations';
import { SingleOrgContextService } from '@/admin/org';
import { LarkClientNotConfiguredException } from '../exceptions';

@Injectable()
export class LarkClient implements OnModuleInit {
  private readonly logger = new Logger(LarkClient.name);
  public client: lark.Client;
  public wsClient: lark.WSClient;
  public isConfigured = false;

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly orgContext: SingleOrgContextService,
  ) {
    this.setupClients(undefined, false);
  }

  async onModuleInit() {
    const { value } = await this.integrationsService.getEffectiveConfig(
      this.orgContext.getOrgId(),
      'lark',
    );
    this.setupClients(value, true);
    if (this.isConfigured) {
      this.logger.log('Lark client initialized successfully');
    }
  }

  @OnEvent(INTEGRATION_EVENT_PATTERNS.LARK_UPDATED)
  handleConfigUpdated(event: IntegrationChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    this.setupClients(event.value, true);
    this.logger.log('Lark client updated from config event');
  }

  @OnEvent(INTEGRATION_EVENT_PATTERNS.LARK_DELETED)
  handleConfigDeleted(event: IntegrationChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    this.setupClients(event.value, true);
    this.logger.log('Lark client reset from config delete event');
  }

  private setupClients(value?: IntegrationValues, notifyWarn = true) {
    const appId = String(value?.appId ?? '').trim();
    const appSecret = String(value?.appSecret ?? '').trim();
    this.isConfigured = Boolean(appId && appSecret);

    if (!this.isConfigured && notifyWarn) {
      this.logger.warn(
        'Lark credentials are not configured or incomplete. Lark API calls will fail.',
      );
    }

    this.client = new lark.Client({ appId, appSecret });
    this.wsClient = new lark.WSClient({ appId, appSecret });
  }

  assertConfigured(): void {
    if (!this.isConfigured) {
      throw new LarkClientNotConfiguredException();
    }
  }
}
