import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Lark from '@larksuiteoapi/node-sdk';
import {
  ConfigTestProvider,
  SystemConfigValues,
} from '@/admin/system-config';
import { TesterService } from '@/admin/system-config/services/tester.service';

@Injectable()
export class LarkTesterService implements ConfigTestProvider, OnModuleInit {
  constructor(private readonly testerService: TesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('lark', this);
  }

  async test(value: SystemConfigValues): Promise<void> {
    const client = new Lark.Client({
      appId: String(value.appId),
      appSecret: String(value.appSecret),
    });
    await client.auth.tenantAccessToken.create();

    const appToken = String(value.bitableAppToken);
    const tableIds = [
      value.meetingTableId,
      value.meetingUserTableId,
      value.recordingFileTableId,
      value.personalSummaryTableId,
    ];
    await Promise.all(
      tableIds.map((tableId) =>
        client.bitable.v1.appTableField.list({
          path: {
            app_token: appToken,
            table_id: String(tableId),
          },
          params: { page_size: 1 },
        }),
      ),
    );
  }
}
