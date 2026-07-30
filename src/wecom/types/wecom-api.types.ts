/**
 * 企业微信基础 API 响应结构
 */
export interface WecomBaseResponse {
  errcode: number;
  errmsg: string;
}

/**
 * access_token 响应结果
 */
export interface WecomTokenResponse extends WecomBaseResponse {
  access_token: string;
  expires_in: number;
}
