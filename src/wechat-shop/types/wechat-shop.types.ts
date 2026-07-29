export enum WechatShopOrderStatus {
  /** 待付款 */
  PENDING_PAYMENT = 10,
  /** 礼物待收下 */
  GIFT_PENDING_RECEIVE = 12,
  /** 一起买待成团 */
  GROUP_BUY_PENDING = 13,
  /** 支付成功待核销 */
  PENDING_VERIFICATION = 17,
  /** 待发货（包括部分发货） */
  PENDING_SHIPMENT = 20,
  /** 部分发货 */
  PARTIAL_SHIPMENT = 21,
  /** 待收货（包括部分发货） */
  PENDING_RECEIPT = 30,
  /** 完成 */
  COMPLETED = 100,
  /** 全部商品售后之后，订单取消 */
  ALL_REFUNDED_CANCELLED = 200,
  /** 未付款用户主动取消或超时未付款订单自动取消 */
  CANCELLED = 250,
}

/**
 * 微信小店 API 通用响应结果
 */
export interface WechatShopApiResponse {
  /** 错误码，0 为成功 */
  errcode?: number;
  /** 错误信息 */
  errmsg?: string;
}

/**
 * 时间范围查询参数
 */
export interface TimeRange {
  /** 起始时间（秒级时间戳） */
  startTime: number;
  /** 结束时间（秒级时间戳） */
  endTime: number;
}

/**
 * 获取订单列表的请求参数
 */
export interface GetOrderListParams {
  /** 订单创建时间范围（与 updateTimeRange 至少填一个，跨度不超过7天） */
  createTimeRange?: TimeRange;
  /** 订单更新时间范围（与 createTimeRange 至少填一个，跨度不超过7天） */
  updateTimeRange?: TimeRange;
  /** 每页数量，不超过100 */
  pageSize?: number;
  /** 分页游标，上一页请求返回 */
  nextKey?: string;
  /** 订单状态过滤 */
  status?: WechatShopOrderStatus | number;
  /** 买家 openid 过滤 */
  openid?: string;
}

/**
 * 订单列表响应结果
 */
export interface OrderListResponse {
  /** 订单 ID 列表 */
  order_id_list?: string[];
  /** 订单列表 (兼容旧版本字段) */
  orders?: string[];
  /** 下一页游标 */
  next_key?: string;
  /** 是否还有更多数据 */
  has_more?: boolean;
}



/**
 * 订单详情响应结果
 */
export interface OrderDetailResponse {
  /** 订单详细数据 */
  order?: WechatShopOrder;
}

/**
 * 微信小店订单结构
 */
export interface WechatShopOrder {
  /** 订单ID */
  order_id: string | number;
  /** 创建时间（秒级时间戳） */
  create_time?: number;
  /** 更新时间（秒级时间戳） */
  update_time?: number;
  /** 订单状态 */
  status?: number;
  /** 买家在微信小店的唯一标识 */
  openid?: string;
  /** 买家在开放平台的唯一标识符 */
  unionid?: string;
  /** 是否为礼物订单 */
  is_present?: boolean;
  /** 礼物订单留言 */
  present_note?: string;
  /** 是否为闪购订单 */
  is_flash_sale_order?: boolean;
  /** 订单详细数据信息 */
  order_detail?: {
    /** 商品列表 */
    product_infos?: WechatShopProductInfo[];
    /** 支付信息 */
    pay_info?: {
      /** 微信支付交易单号 */
      transaction_id?: string;
      /** 预支付时间（秒级时间戳） */
      prepay_time?: number;
      /** 支付时间（秒级时间戳） */
      pay_time?: number;
      /** 支付方式 */
      payment_method?: number;
    };
    /** 价格及资金信息 */
    price_info?: {
      /** 商品总价（分） */
      product_price?: number;
      /** 订单实际支付金额（分） */
      order_price?: number;
      /** 运费（分） */
      freight?: number;
      /** 优惠金额（分） */
      discounted_price?: number;
      /** 是否有商家优惠金额 */
      is_discounted?: boolean;
      /** 原始订单金额（分） */
      original_order_price?: number;
      /** 预计商品金额（分） */
      estimate_product_price?: number;
      /** 商家改价降低的金额（分） */
      change_down_price?: number;
      /** 修改后的运费（分） */
      change_freight?: number;
      /** 是否修改过运费 */
      is_change_freight?: boolean;
      /** 是否使用了会员积分抵扣 */
      use_deduction?: boolean;
      /** 会员积分抵扣金额（分） */
      deduction_price?: number;
    };
    /** 配送信息 */
    delivery_info?: {
      /** 收货人地址信息 */
      address_info?: {
        user_name?: string;
        postal_code?: string;
        province_name?: string;
        city_name?: string;
        county_name?: string;
        detail_info?: string;
        tel_number?: string;
        /** 虚拟收货号码（隐私号） */
        virtual_order_tel_number?: string;
        /** 使用电话的类型 */
        use_tel_number?: number;
      };
      /** 妥投时间（秒级时间戳） */
      ship_done_time?: number;
      /** 配送方式 */
      deliver_method?: number;
    };
    /** 售后退款信息 */
    refund_info?: {
      amount?: number;
      refund_amount?: number;
      refund_status?: number;
    };
    /** 额外信息 */
    ext_info?: Record<string, unknown>;
    /** 优惠券信息 */
    coupon_info?: Record<string, unknown>;
    /** 结算信息 */
    settle_info?: Record<string, unknown>;
  };
  /** 售后详情信息 */
  aftersale_detail?: {
    /** 正在售后流程中的订单数 */
    on_aftersale_order_cnt?: number;
    /** 售后订单列表 */
    aftersale_order_list?: Array<{
      aftersale_order_id?: string | number;
      status?: number;
    }>;
  };
}

/**
 * 订单内的商品详细信息
 */
export interface WechatShopProductInfo {
  /** 微信小店商品ID */
  product_id?: string | number;
  /** 商品规格 SKU ID */
  sku_id?: string | number;
  /** 商品标题 */
  title?: string;
  /** SKU 缩略图 */
  thumb_img?: string;
  /** 售卖单价（分） */
  sale_price?: number;
  /** 市场单价（分） */
  market_price?: number;
  /** SKU 实付总价（分） */
  real_price?: number;
  /** 购买的 SKU 数量 */
  sku_cnt?: number;
  /** 商家自定义 SKU 编码 */
  sku_code?: string;
  /** 正在售后/退款流程中的 SKU 数量 */
  on_aftersale_sku_cnt?: number;
  /** 已完成售后/退款的 SKU 数量 */
  finish_aftersale_sku_cnt?: number;
  /** SKU 具体属性列表（例如颜色、尺寸等） */
  sku_attrs?: Array<{
    attr_key?: string;
    attr_value?: string;
  }>;
}
