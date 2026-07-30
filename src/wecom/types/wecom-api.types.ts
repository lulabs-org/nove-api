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

export interface WecomExternalProfileAttr {
  type: number;
  name: string;
  text?: { value: string };
  web?: { url: string; title: string };
  miniprogram?: { appid: string; pagepath: string; title: string };
}

export interface WecomExternalContact {
  external_userid: string;
  name: string;
  position?: string;
  avatar: string;
  corp_name?: string;
  corp_full_name?: string;
  type: number;
  gender: number;
  unionid?: string;
  external_profile?: {
    external_attr: WecomExternalProfileAttr[];
  };
}

export interface WecomFollowUserTag {
  group_name: string;
  tag_name: string;
  tag_id?: string;
  type: number;
}

export interface WecomFollowUser {
  userid: string;
  remark: string;
  description: string;
  createtime: number;
  tags?: WecomFollowUserTag[];
  remark_corp_name?: string;
  remark_mobiles?: string[];
  oper_userid: string;
  add_way: number;
  state?: string;
  wechat_channels?: {
    nickname: string;
    source: number;
  };
}

export interface WecomExternalContactResponse extends WecomBaseResponse {
  external_contact: WecomExternalContact;
  follow_user: WecomFollowUser[];
  next_cursor?: string;
}
