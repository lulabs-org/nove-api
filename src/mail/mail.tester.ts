import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  IntegrationTestProvider,
  IntegrationValues,
  IntegrationTesterService,
} from '@/admin/integrations';

@Injectable()
export class MailTesterService implements IntegrationTestProvider, OnModuleInit {
  constructor(private readonly testerService: IntegrationTesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('mail', this);
  }

  async test(value: IntegrationValues): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: String(value.host),
      port: Number(value.port),
      secure: Boolean(value.secure),
      auth: { user: String(value.user), pass: String(value.pass) },
    });
    try {
      await transporter.verify();
    } finally {
      transporter.close();
    }
  }
}
