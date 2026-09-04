/**
 * 微信小店 API 通用响应结果
 */
export interface WechatShopApiResponse {
  /** 错误码，0 为成功 */
  errcode?: number;
  /** 错误信息 */
  errmsg?: string;
}
