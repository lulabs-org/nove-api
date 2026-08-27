-- 令牌版本：递增后使该用户所有已签发的 access token 立即失效
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
