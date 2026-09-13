import { WechatShopApiResponse } from './wechat-shop-common.types';

/**
 * 获取售后单详情请求参数
 */
export interface GetAftersaleOrderParams {
  /** 售后单号 */
  after_sale_order_id: string;
}

/**
 * 获取售后单详情响应结果
 */
export interface AftersaleOrderDetailResponse extends WechatShopApiResponse {
  /** 售后单详细数据 */
  after_sale_order?: WechatShopAftersaleOrder;
}

/**
 * 获取售后单列表请求参数
 * @see https://developers.weixin.qq.com/doc/store/shop/API/channels-shop-aftersale/aftersale/api_getaftersalelist.html
 */
export interface GetAftersaleListParams {
  /** 售后单创建起始时间（秒级时间戳）；begin_create_time/end_create_time 和 begin_update_time/end_update_time 成对使用，必选其一 */
  begin_create_time?: number;
  /** 售后单创建结束时间（秒级时间戳），end_create_time 减去 begin_create_time 不得大于 24 小时 */
  end_create_time?: number;
  /** 售后单更新起始时间（秒级时间戳） */
  begin_update_time?: number;
  /** 售后单更新结束时间（秒级时间戳），end_update_time 减去 begin_update_time 不得大于 24 小时 */
  end_update_time?: number;
  /** 翻页参数，从第二页开始传，来源于上一页的返回值 */
  next_key?: string;
}

/**
 * 获取售后单列表响应结果
 */
export interface GetAftersaleListResponse extends WechatShopApiResponse {
  /** 售后单号列表 */
  after_sale_order_id_list?: string[];
  /** 是否还有数据 */
  has_more?: boolean;
  /** 翻页参数，供下一页查询使用 */
  next_key?: string;
}

/**
 * 微信小店售后单完整结构
 * @see https://developers.weixin.qq.com/doc/store/shop/API/channels-shop-aftersale/aftersale/api_getaftersaleorder.html
 */
export interface WechatShopAftersaleOrder {
  /** 售后单号 */
  after_sale_order_id: string;
  /** 售后单当前状态 */
  status: WechatShopAftersaleStatus | string;
  /** 关联订单号，该字段可用于获取订单 */
  order_id: string;
  /** 订单归属人身份标识，在自购场景为支付者（买家），在礼物场景为收礼者 */
  openid?: string;
  /** 订单归属人在开放平台的唯一标识符，若已绑定微信开放平台账号则返回 */
  unionid?: string;
  /** 礼物订单赠送者 openid，仅送礼订单返回该字段 */
  present_giver_openid?: string;
  /** 礼物订单赠送者在开放平台的唯一标识符 */
  present_giver_unionid?: string;
  /** 售后相关商品信息 */
  product_info?: WechatShopAftersaleProductInfo;
  /** 退款详情 */
  refund_info?: WechatShopAftersaleRefundInfo;
  /** 用户退货信息 */
  return_info?: WechatShopAftersaleReturnInfo;
  /** 商家上传的信息 */
  merchant_upload_info?: WechatShopAftersaleMerchantUploadInfo;
  /** 售后单创建时间戳（秒级） */
  create_time?: number;
  /** 售后单更新时间戳（秒级） */
  update_time?: number;
  /** 售后完结秒级时间戳（售后完结后有效） */
  complete_time?: number;
  /** 退款原因（后续新增的原因将不再有字面含义，请参考 reason_text） */
  reason?: string;
  /** 退款原因解释 */
  reason_text?: WechatShopAftersaleReasonText | string;
  /** 售后类型：REFUND:退款；RETURN:退货退款；EXCHANGE:换货；RESHIP:补寄 */
  type?: WechatShopAftersaleType | string;
  /** 售后子类型：DEFAULT:普通售后；REFUND_PRICE_DIFF:退差价售后 */
  sub_type?: WechatShopAftersaleSubType | string;
  /** 纠纷 ID，该字段可用于获取纠纷信息 */
  complaint_id?: string;
  /** 微信支付退款的响应 */
  refund_resp?: WechatShopAftersaleRefundResp;
  /** 仅在待商家审核退款退货申请或收货期间返回，表示当前状态的截止时间（秒级时间戳） */
  deadline?: number;
  /** 换货相关商品信息 */
  exchange_product_info?: WechatShopAftersaleExchangeProductInfo;
  /** 换货相关物流信息 */
  exchange_delivery_info?: WechatShopAftersaleExchangeDeliveryInfo;
  /** 虚拟号码信息 */
  virtual_tel_num_info?: WechatShopAftersaleVirtualTelNumInfo;
  /** 商责额外赔付（单位：分） */
  compensation_liability_amount?: number;
  /** 售后详情 */
  details?: WechatShopAftersaleDetails;
  /** 商家发起协商信息。仅在 [待用户处理商家协商] 状态返回 */
  merchant_update_detail?: WechatShopAftersaleMerchantUpdateDetail;
  /** 是否需要线下退款。仅在售后状态为 [PLATFORM_REFUND_FAIL] 有效 */
  need_offline_refund?: boolean;
  /** 换货字段 */
  exchange_info?: WechatShopAftersaleExchangeInfo;
  /** 售后单本地生活类型：1=未核销 2=已预约 3=已核销；非券售后不设置 */
  aftersale_voucher_type?: WechatShopAftersaleVoucherType | number;
}

/* ==========================================================================
   售后子结构定义 (Sub-interfaces)
   ========================================================================== */

/**
 * 售后相关商品信息
 */
export interface WechatShopAftersaleProductInfo {
  /** 商品 SPU ID */
  product_id?: string;
  /** 商品 SKU ID */
  sku_id?: string;
  /** 售后数量 */
  count?: number;
  /** 是否极速退款 */
  fast_refund?: boolean;
  /** 赠品信息 */
  gift_product_list?: WechatShopAftersaleGiftProduct[];
  /** 商品 SKU Code */
  sku_code?: string;
  /** 本地生活券退款明细 */
  voucher_list?: WechatShopAftersaleVoucher[];
}

/**
 * 售后赠品信息
 */
export interface WechatShopAftersaleGiftProduct {
  /** 商品 SPU ID */
  product_id?: string;
  /** 商品 SKU ID */
  sku_id?: string;
  /** 退款数量 */
  count?: number;
  /** 商品 SKU Code */
  sku_code?: string;
  /** 赠品任务 ID（部分场景返回） */
  task_id?: number;
}

/**
 * 本地生活券退款明细
 */
export interface WechatShopAftersaleVoucher {
  /** 本地券券码（券级别 key） */
  vourcher_code?: string;
  /** 券退款金额，单位分 */
  amount?: number;
  /** 次卡次数明细（仅次卡券有值，普通券为空） */
  times_list?: WechatShopAftersaleVoucherTime[];
}

/**
 * 次卡次数明细
 */
export interface WechatShopAftersaleVoucherTime {
  /** 次卡 ID（次级别 key） */
  serial_id?: string;
  /** 退款金额，单位分 */
  amount?: number;
}

/**
 * 售后退款详情
 */
export interface WechatShopAftersaleRefundInfo {
  /** 退款金额（分） */
  amount?: number;
  /** 标明售后单退款直接原因 */
  refund_reason?: WechatShopAftersaleRefundReason | number;
  /** 平台优惠退款金额（分） */
  platform_discount_return_amount?: number;
  /** 是否使用运费险小额保障退款 */
  is_low_price_insurance_refund?: boolean;
  /** 是否最终由运费险出资 */
  is_final_refund_by_insurance?: boolean;
}

/**
 * 用户退货信息
 */
export interface WechatShopAftersaleReturnInfo {
  /** 快递单号 */
  waybill_id?: string;
  /** 物流公司 ID */
  delivery_id?: string;
  /** 物流公司名称 */
  delivery_name?: string;
  /** 退回方式：0-无物流 1-自行寄回 2-上门取件 */
  return_type?: WechatShopAftersaleReturnType | number;
  /** 退货地址信息 */
  address_info?: WechatShopAftersaleAddressInfo;
}

/**
 * 地址信息（通用收货/退货地址）
 */
export interface WechatShopAftersaleAddressInfo {
  /** 收货人姓名 */
  user_name?: string;
  /** 邮编 */
  postal_code?: string;
  /** 国标收货地址第一级地址（省份） */
  province_name?: string;
  /** 国标收货地址第二级地址（城市） */
  city_name?: string;
  /** 国标收货地址第三级地址（区/县） */
  county_name?: string;
  /** 详细收货地址信息 */
  detail_info?: string;
  /** 收货地址国家码 */
  national_code?: string;
  /** 收货人手机号码 */
  tel_number?: string;
  /** 门牌号 */
  house_number?: string;
}

/**
 * 商家上传的信息
 */
export interface WechatShopAftersaleMerchantUploadInfo {
  /** 拒绝原因 */
  reject_reason?: string;
  /** 退款凭证列表 */
  refund_certificates?: string[];
}

/**
 * 微信支付退款的响应
 */
export interface WechatShopAftersaleRefundResp {
  /** 错误码 */
  code?: string;
  /** 状态码 */
  ret?: number;
  /** 描述 */
  message?: string;
}

/**
 * 换货相关商品信息
 */
export interface WechatShopAftersaleExchangeProductInfo {
  /** 商品 SPU ID */
  product_id?: string;
  /** 旧商品 SKU ID */
  old_sku_id?: string;
  /** 新商品 SKU ID */
  new_sku_id?: string;
  /** 数量 */
  product_cnt?: number;
  /** 旧商品价格（分） */
  old_sku_price?: number;
  /** 新商品价格（分） */
  new_sku_price?: number;
  /** 旧商品 SKU Code */
  old_sku_code?: string;
  /** 新商品 SKU Code */
  new_sku_code?: string;
}

/**
 * 换货相关物流信息
 */
export interface WechatShopAftersaleExchangeDeliveryInfo {
  /** 快递单号 */
  waybill_id?: string;
  /** 物流公司 ID */
  delivery_id?: string;
  /** 物流公司名称 */
  delivery_name?: string;
  /** 用户收货地址信息 */
  user_address_info?: WechatShopAftersaleExchangeAddressInfo;
}

/**
 * 换货地址信息
 */
export interface WechatShopAftersaleExchangeAddressInfo
  extends WechatShopAftersaleAddressInfo {
  /** 虚拟商品订单联系方式，虚拟商品订单必填 (deliver_method=1) */
  virtual_order_tel_number?: string;
}

/**
 * 虚拟号码信息
 */
export interface WechatShopAftersaleVirtualTelNumInfo {
  /** 虚拟号码 */
  virtual_tel_number?: string;
  /** 虚拟号码过期时间（秒级时间戳） */
  virtual_tel_expire_time?: number;
}

/**
 * 售后详情补充信息
 */
export interface WechatShopAftersaleDetails {
  /** 用户申请售后描述 */
  desc?: string;
  /** 用户是否收到货：false 未收到货，true 收到货 */
  receive_product?: boolean;
  /** 取消时间戳（秒级） */
  cancel_time?: number;
  /** 举证图片 Media ID 列表 */
  media_id_list?: string[];
  /** 用户举证多媒体信息列表 */
  media_infos?: WechatShopAftersaleMediaInfo[];
}

/**
 * 用户举证多媒体信息
 */
export interface WechatShopAftersaleMediaInfo {
  /** 多媒体类型：1 图片；2 视频 */
  media_type?: WechatShopAftersaleMediaType | number;
  /** media_type=1 时表示用户举证图片，media_type=2 时表示用户举证的视频封面 */
  picture_media_id?: string;
  /** media_type=2 时生效，用户举证的视频数据 */
  video_media_id?: string;
  /** media_type=2 时生效，视频时长，单位为秒 */
  video_play_length?: number;
}

/**
 * 商家发起协商信息（仅在 [待用户处理商家协商] 状态返回）
 */
export interface WechatShopAftersaleMerchantUpdateDetail {
  /** 协商类型 */
  merchant_update_type?: number;
  /** 协商原因 */
  update_reason_type?: number;
  /** 协商描述 */
  merchant_update_desc?: string;
  /** 协商前售后类型。1:退款；2:退货退款；3:换货 */
  old_after_sale_type?: number;
  /** 协商后售后类型。1:退款；2:退货退款；3:换货 */
  new_after_sale_type?: number;
  /** 协商前售后金额（单位：分） */
  old_after_sale_amount?: number;
  /** 协商后售后金额（单位：分） */
  new_after_sale_amount?: number;
  /** 协商图片信息（Media ID 列表） */
  media_ids?: string[];
}

/**
 * 换货字段
 */
export interface WechatShopAftersaleExchangeInfo {
  /** 极速换货字段 */
  fast_exchange_info?: {
    /** 是否极速换货 */
    fast_exchange?: boolean;
    /** 极速换货商家操作动作 */
    fast_exchange_act?: {
      /** 1-已确认 */
      merchant_confirm?: number;
      /** 确认时间戳（秒级） */
      merchant_confirm_time?: number;
      /** 1-已拒绝 */
      merchant_reject?: number;
      /** 拒绝时间戳（秒级） */
      merchant_reject_time?: number;
    };
  };
}

/* ==========================================================================
   售后枚举值定义 (Enums)
   ========================================================================== */

/**
 * 售后单状态枚举
 * @see https://developers.weixin.qq.com/doc/store/shop/API/channels-shop-aftersale/aftersale/api_getaftersaleorder.html
 */
export enum WechatShopAftersaleStatus {
  /** 用户取消申请 */
  USER_CANCELD = 'USER_CANCELD',
  /** 商家受理中 */
  MERCHANT_PROCESSING = 'MERCHANT_PROCESSING',
  /** 商家拒绝退款 */
  MERCHANT_REJECT_REFUND = 'MERCHANT_REJECT_REFUND',
  /** 商家拒绝退货退款 */
  MERCHANT_REJECT_RETURN = 'MERCHANT_REJECT_RETURN',
  /** 待买家退货 */
  USER_WAIT_RETURN = 'USER_WAIT_RETURN',
  /** 退货退款关闭 */
  RETURN_CLOSED = 'RETURN_CLOSED',
  /** 待商家收货 */
  MERCHANT_WAIT_RECEIPT = 'MERCHANT_WAIT_RECEIPT',
  /** 商家逾期未退款 */
  MERCHANT_OVERDUE_REFUND = 'MERCHANT_OVERDUE_REFUND',
  /** 退款完成 */
  MERCHANT_REFUND_SUCCESS = 'MERCHANT_REFUND_SUCCESS',
  /** 退货退款完成 */
  MERCHANT_RETURN_SUCCESS = 'MERCHANT_RETURN_SUCCESS',
  /** 平台退款中 */
  PLATFORM_REFUNDING = 'PLATFORM_REFUNDING',
  /** 平台退款失败 */
  PLATFORM_REFUND_FAIL = 'PLATFORM_REFUND_FAIL',
  /** 待用户确认 */
  USER_WAIT_CONFIRM = 'USER_WAIT_CONFIRM',
  /** 商家打款失败，客服关闭售后 */
  MERCHANT_REFUND_RETRY_FAIL = 'MERCHANT_REFUND_RETRY_FAIL',
  /** 售后关闭 */
  MERCHANT_FAIL = 'MERCHANT_FAIL',
  /** 待用户处理商家协商 */
  USER_WAIT_CONFIRM_UPDATE = 'USER_WAIT_CONFIRM_UPDATE',
  /** 待用户处理商家代发起的售后申请 */
  USER_WAIT_HANDLE_MERCHANT_AFTER_SALE = 'USER_WAIT_HANDLE_MERCHANT_AFTER_SALE',
  /** 物流线上拦截中 */
  WAIT_PACKAGE_INTERCEPT = 'WAIT_PACKAGE_INTERCEPT',
  /** 商家拒绝换货 */
  MERCHANT_REJECT_EXCHANGE = 'MERCHANT_REJECT_EXCHANGE',
  /** 商家拒绝发货 */
  MERCHANT_REJECT_RESHIP = 'MERCHANT_REJECT_RESHIP',
  /** 待用户收货 */
  USER_WAIT_RECEIPT = 'USER_WAIT_RECEIPT',
  /** 换货完成 */
  MERCHANT_EXCHANGE_SUCCESS = 'MERCHANT_EXCHANGE_SUCCESS',
  /** 平台审核中 */
  PLATFORM_PROCESSING = 'PLATFORM_PROCESSING',
}

/**
 * 售后类型枚举
 */
export enum WechatShopAftersaleType {
  /** 退款 */
  REFUND = 'REFUND',
  /** 退货退款 */
  RETURN = 'RETURN',
  /** 换货 */
  EXCHANGE = 'EXCHANGE',
  /** 补寄 */
  RESHIP = 'RESHIP',
}

/**
 * 售后子类型枚举
 */
export enum WechatShopAftersaleSubType {
  /** 普通售后 */
  DEFAULT = 'DEFAULT',
  /** 退差价售后 */
  REFUND_PRICE_DIFF = 'REFUND_PRICE_DIFF',
}

/**
 * 退款原因解释枚举
 */
export enum WechatShopAftersaleReasonText {
  /** 拍错/多拍 */
  INCORRECT_SELECTION = 'INCORRECT_SELECTION',
  /** 不想要了 */
  NO_LONGER_WANT = 'NO_LONGER_WANT',
  /** 无快递信息 */
  NO_EXPRESS_INFO = 'NO_EXPRESS_INFO',
  /** 包裹为空 */
  EMPTY_PACKAGE = 'EMPTY_PACKAGE',
  /** 已拒签包裹 */
  REJECT_RECEIVE_PACKAGE = 'REJECT_RECEIVE_PACKAGE',
  /** 快递长时间未送达 */
  NOT_DELIVERED_TOO_LONG = 'NOT_DELIVERED_TOO_LONG',
  /** 与商品描述不符 */
  NOT_MATCH_PRODUCT_DESC = 'NOT_MATCH_PRODUCT_DESC',
  /** 质量问题 */
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  /** 卖家发错货 */
  SEND_WRONG_GOODS = 'SEND_WRONG_GOODS',
  /** 三无产品 */
  THREE_NO_PRODUCT = 'THREE_NO_PRODUCT',
  /** 假冒产品 */
  FAKE_PRODUCT = 'FAKE_PRODUCT',
  /** 七天无理由 */
  NO_REASON_7_DAYS = 'NO_REASON_7_DAYS',
  /** 平台代发起 */
  INITIATE_BY_PLATFORM = 'INITIATE_BY_PLATFORM',
  /** 其它 */
  OTHERS = 'OTHERS',
}

/**
 * 售后单退款直接原因枚举
 */
export enum WechatShopAftersaleRefundReason {
  /** 商家通过店铺管理页或者小助手发起退款 */
  MERCHANT_MANUAL = 1,
  /** 退货退款场景，商家同意买家未上传物流单号情况下确认收货并退款，该场景限于订单无运费险 */
  MERCHANT_NO_LOGISTICS_CONFIRM = 2,
  /** 商家通过后台api发起退款 */
  MERCHANT_API = 3,
  /** 未发货售后平台自动同意 */
  UNSHIPPED_AUTO_AGREE = 4,
  /** 平台介入纠纷退款 */
  PLATFORM_DISPUTE = 5,
  /** 特殊场景下平台强制退款 */
  PLATFORM_FORCE = 6,
  /** 退货退款场景，买家同意没有上传物流单号情况下，商家确认收货并退款，该场景限于订单包含运费险，并无法理赔 */
  BUYER_AGREE_NO_LOGISTICS_CONFIRM = 7,
  /** 商家发货超时，平台退款 */
  MERCHANT_DELIVERY_TIMEOUT = 8,
  /** 商家处理买家售后申请超时，平台自动同意退款 */
  MERCHANT_PROCESS_TIMEOUT = 9,
  /** 用户确认收货超时，平台退款 */
  BUYER_RECEIPT_TIMEOUT = 10,
  /** 商家确认收货超时，平台退款 */
  MERCHANT_RECEIPT_TIMEOUT = 11,
  /** 商家发起协商，用户同意商家协商方案 */
  BUYER_AGREE_MERCHANT_NEGOTIATION = 12,
  /** 券超时未发放退款 */
  COUPON_ISSUE_TIMEOUT = 13,
  /** 券超时未使用退款 */
  COUPON_USAGE_TIMEOUT = 14,
  /** 券未使用退款 */
  COUPON_UNUSED = 15,
  /** 券发起退款回调 */
  COUPON_REFUND_CALLBACK = 16,
  /** 用户同意商家代用户发起仅退款 */
  BUYER_AGREE_MERCHANT_INITIATED_REFUND = 17,
  /** 券场景商家在B端同意退款 */
  COUPON_MERCHANT_AGREE = 18,
  /** 券场景平台客服退款 */
  COUPON_PLATFORM_KF = 19,
  /** 商家发起协商退货退款改为仅退款 */
  MERCHANT_NEGOTIATE_RETURN_TO_REFUND = 21,
  /** 用户申请仅退款时，商家发起线上拦截物流成功 */
  INTERCEPT_LOGISTICS_SUCCESS = 22,
  /** 平台纠纷判责部分退款 */
  PLATFORM_DISPUTE_PARTIAL_REFUND = 23,
  /** 运费险小额保障退款 */
  FREIGHT_INSURANCE_GUARANTEE = 24,
}

/**
 * 售后退回方式枚举
 */
export enum WechatShopAftersaleReturnType {
  /** 无物流 */
  NO_LOGISTICS = 0,
  /** 自行寄回 */
  SELF_DELIVERY = 1,
  /** 上门取件 */
  PICKUP = 2,
}

/**
 * 售后单本地生活类型枚举
 */
export enum WechatShopAftersaleVoucherType {
  /** 未核销 */
  UNVERIFIED = 1,
  /** 已预约 */
  RESERVED = 2,
  /** 已核销 */
  VERIFIED = 3,
}

/**
 * 举证多媒体类型枚举
 */
export enum WechatShopAftersaleMediaType {
  /** 图片 */
  IMAGE = 1,
  /** 视频 */
  VIDEO = 2,
}
