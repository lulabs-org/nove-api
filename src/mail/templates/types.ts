export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface EmailBrand {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  footerText: string;
}

export interface EmailBrandContext {
  /** Must come from a server-trusted authentication or resource context. */
  orgId?: string;
}

export type VerificationEmailType =
  | 'register'
  | 'login'
  | 'reset_password'
  | 'security';

export interface ContactChangeEmailOptions {
  contactLabel: '邮箱' | '手机号';
  newContactMasked: string;
  changedAt: Date;
  recipient: 'OLD' | 'NEW';
}
