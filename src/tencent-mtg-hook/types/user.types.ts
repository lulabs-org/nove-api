/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-21 19:57:10
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-21 20:09:45
 * @FilePath: /nove_api/src/tencent-mtg-hook/types/user.types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

export interface Meetuser {
  userid: string;
  user_name: string;
  uuid: string;
  instance_id: string;
  ms_open_id: string;
}

export interface Operator {
  userid?: string;
  open_id?: string;
  uuid?: string;
  user_name?: string;
  nick_name?: string;
  ms_open_id?: string;
  instance_id: string;
}

export interface MeetingCreator {
  userid: string;
  uuid: string;
  user_name: string;
  ms_open_id?: string;
  instance_id?: string;
}
