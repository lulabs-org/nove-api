export interface ChannelsEcOrderPayEvent {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Event: 'channels_ec_order_pay';
  order_info: {
    order_id: string | number;
    pay_time: number;
  };
}

export interface ChannelsEcAftersaleUpdateEvent {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Event: 'channels_ec_aftersale_update';
  finder_shop_aftersale_status_update: {
    status: string;
    after_sale_order_id: string | number;
    order_id: string | number;
    wxa_vip_discounted_price?: number;
  };
}
