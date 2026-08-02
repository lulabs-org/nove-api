/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Description: 邀请/加入组织邮件模板
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { escapeHtml, buildEmailShell } from './_shell';

export interface InviteEmailData {
  /** 收件人姓名（来自 profile.displayName 或 username） */
  name: string;
  /** 组织名称 */
  orgName: string;
  /** 登录邮箱 */
  email: string;
  /** 邀请令牌（新用户接受邀请时使用） */
  invitationToken?: string;
  /** 成员 ID（接受邀请时定位成员记录） */
  memberId?: string;
  /** 前端基础地址 */
  frontendUrl: string;
  /** 邀请链接有效天数（用于邮件正文展示） */
  invitationExpiresInDays: number;
}

/**
 * 构造"新用户被邀请加入组织"邮件，包含邀请链接。
 * 用户点击链接接受邀请后，可通过邮箱验证码登录。
 */
export function buildInviteEmail(data: InviteEmailData): {
  subject: string;
  html: string;
} {
  const safeName = escapeHtml(data.name || '用户');
  const safeOrgName = escapeHtml(data.orgName || '组织');
  const safeEmail = escapeHtml(data.email || '');
  const safeLoginUrl = escapeHtml(`${data.frontendUrl}/login`);

  // 构造邀请接受链接：前端页面携带 token 与 memberId 调用接受接口
  const inviteUrl =
    data.invitationToken && data.memberId
      ? `${data.frontendUrl}/invite/accept?memberId=${encodeURIComponent(data.memberId)}&token=${encodeURIComponent(data.invitationToken)}`
      : safeLoginUrl;
  const safeInviteUrl = escapeHtml(inviteUrl);

  const subject = `您已被邀请加入 ${data.orgName}`;

  const innerHtml = `
          <p style="color: #666; font-size: 16px; line-height: 1.5;">${safeName}，您好！</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您已被管理员添加为 <strong>${safeOrgName}</strong> 的成员。</p>

          <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #e9ecef;">
            <p style="color: #333; margin: 0 0 8px 0; font-size: 14px;">登录邮箱：</p>
            <p style="color: #333; margin: 0; font-size: 14px;"><strong>${safeEmail}</strong></p>
          </div>

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #155724; margin: 0; font-size: 14px;">
              请点击下方按钮接受邀请，接受后可使用邮箱验证码登录系统。
            </p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${safeInviteUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">接受邀请</a>
          </div>

          <p style="color: #999; font-size: 12px; line-height: 1.5;">邀请链接：${safeInviteUrl}</p>
          <p style="color: #999; font-size: 12px; line-height: 1.5;">该邀请链接 ${data.invitationExpiresInDays} 天内有效。</p>
        `;

  return buildEmailShell(subject, innerHtml);
}
