export interface WechatShopApiResponse {
  errcode?: number;
  errmsg?: string;
}

export interface WechatShopOrderListResponse extends WechatShopApiResponse {
  order_id_list?: string[];
  orders?: string[];
  next_key?: string;
  has_more?: boolean;
}

export interface WechatShopOrderDetailResponse extends WechatShopApiResponse {
  order?: WechatShopOrder;
}

export interface WechatShopOrder {
  order_id?: string | number;
  create_time?: number;
  update_time?: number;
  status?: number;
  openid?: string;
  unionid?: string;
  order_detail?: {
    product_infos?: WechatShopProductInfo[];
    pay_info?: {
      transaction_id?: string;
      prepay_time?: number;
      pay_time?: number;
      pay_method_type?: number;
    };
    price_info?: {
      order_price?: number;
      freight?: number;
      discounted_price?: number;
      additional_price?: number;
      additional_remarks?: string;
      change_down_price?: number;
      change_down_price_type?: number;
    };
    delivery_info?: {
      address_info?: {
        user_name?: string;
        tel_number?: string;
        province_name?: string;
        city_name?: string;
        county_name?: string;
        detail_info?: string;
      };
    };
    // 旧版/简化退款信息，字段名随微信接口版本可能不同。
    refund_info?: {
      amount?: number;
      refund_amount?: number;
      refund_status?: number;
      after_sale_code?: string;
      aftersale_code?: string;
      after_sale_id?: string | number;
      aftersale_id?: string | number;
      after_sale_order_id?: string | number;
      refund_id?: string | number;
      reason?: string;
      refund_reason?: string;
      create_time?: number;
      update_time?: number;
      refund_time?: number;
      refunded_time?: number;
    };
    ext_info?: Record<string, unknown>;
  };
  // 售后详情可能是一条，也可能是多条售后记录。
  aftersale_detail?: WechatShopAftersaleDetail | WechatShopAftersaleDetail[];
}

export interface WechatShopProductInfo {
  product_id?: string | number;
  sku_id?: string | number;
  title?: string;
  sale_price?: number;
  real_price?: number;
  sku_cnt?: number;
  sku_code?: string;
}

// 微信售后详情字段，保留多种编号/金额命名以兼容不同返回结构。
//如果微信返回的是 after_sale_code，我们能识别；如果返回的是 refund_id，我们也能识别。
// 这样同步退款时更稳，兼容微信返回数据里可能出现的不同字段名，以免微信接口版本演进导致字段名变化而无法识别。
export interface WechatShopAftersaleDetail {
  after_sale_code?: string;
  aftersale_code?: string;
  after_sale_id?: string | number;
  aftersale_id?: string | number;
  after_sale_order_id?: string | number;
  refund_id?: string | number;
  status?: number;
  refund_status?: number;
  amount?: number;
  refund_amount?: number;
  reason?: string;
  refund_reason?: string;
  create_time?: number;
  update_time?: number;
  refund_time?: number;
  refunded_time?: number;
}
