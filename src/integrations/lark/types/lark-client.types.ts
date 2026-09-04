export interface LarkClientConfig {
  appId: string;
  appSecret: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  baseUrl?: string;
}
