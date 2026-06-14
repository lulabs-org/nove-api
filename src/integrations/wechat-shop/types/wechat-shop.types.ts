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
    refund_info?: {
      amount?: number;
      refund_amount?: number;
      refund_status?: number;
    };
    ext_info?: Record<string, unknown>;
  };
  aftersale_detail?: unknown;
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
