/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 17:55:00
 * @Description: 认证相关枚举定义 (AuthType, LoginType)
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

export enum AuthType {
  USERNAME_PASSWORD = 'username_password',
  EMAIL_PASSWORD = 'email_password',
  EMAIL_CODE = 'email_code',
  PHONE_PASSWORD = 'phone_password',
  PHONE_CODE = 'phone_code',
}

export enum LoginType {
  USERNAME_PASSWORD = 'USERNAME_PASSWORD',
  EMAIL_PASSWORD = 'EMAIL_PASSWORD',
  EMAIL_CODE = 'EMAIL_CODE',
  PHONE_PASSWORD = 'PHONE_PASSWORD',
  PHONE_CODE = 'PHONE_CODE',
  PASSWORD_RESET = 'PASSWORD_RESET',
}
