-- AlterTable
-- 用户级令牌失效边界：密码重置/修改时递增，JWT 校验时与 payload.ver 比对
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
