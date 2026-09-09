export interface WecomBaseEvent {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Event: string;
}

export interface WecomChangeExternalContactEvent extends WecomBaseEvent {
  ChangeType:
    | 'add_external_contact'
    | 'edit_external_contact'
    | 'add_half_external_contact'
    | 'del_external_contact'
    | 'del_follow_user'
    | 'transfer_fail';
  UserID: string;
  ExternalUserID: string;
  State?: string;
  WelcomeCode?: string;
  Source?: string;
  FailReason?: string;
}

export interface WecomChangeExternalChatEvent extends WecomBaseEvent {
  ChangeType: 'create' | 'update' | 'dismiss';
  ChatId: string;
  UpdateDetail?: string;
  JoinScene?: number;
  QuitScene?: number;
  MemChangeCnt?: number;
  MemChangeList?: { Item: string | string[] };
  LastMemVer?: string;
  CurMemVer?: string;
}

export interface WecomChangeExternalTagEvent extends WecomBaseEvent {
  ChangeType: 'create' | 'update' | 'delete' | 'shuffle';
  Id: string;
  TagType?: string;
  StrategyId?: string | number;
}
