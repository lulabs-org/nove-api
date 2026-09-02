import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigTestProvider, SystemConfigValues } from '@/admin/system-config';
import { TesterService } from '@/admin/system-config/services/tester.service';

@Injectable()
export class MailTesterService implements ConfigTestProvider, OnModuleInit {
  constructor(private readonly testerService: TesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('mail', this);
  }

  async test(value: SystemConfigValues): Promise<void> {
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
