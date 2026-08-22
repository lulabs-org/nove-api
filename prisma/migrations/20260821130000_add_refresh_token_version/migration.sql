-- AlterTable
-- refresh token 记录诞生时的用户令牌版本快照：
-- 轮换时与 users.token_version 比对，不一致即拒绝（版本护栏，
-- 阻断旧会话的 refresh token 在密码重置后换发新会话）
ALTER TABLE "refresh_tokens" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
