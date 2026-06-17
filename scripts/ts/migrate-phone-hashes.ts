/**
 * @file migrate-phone-hashes.ts
 * @description 历史用户手机号加密同步脚本 (One-off Migration Script)
 * 
 * 【背景】
 * 针对第三方平台（如腾讯会议）回调中仅提供手机号 Hash，而本地系统 `User` 表仅存储明文手机号的问题。
 * 本脚本旨在遍历系统中已有的存量用户，将其手机号提取出来，通过不可逆加密算法计算出 Hash，
 * 并统一写入到独立的映射表 `UserPhoneHash` 中。完成映射后，系统便能具备 O(1) 的极速 Webhook 识别能力。
 * 
 * 【前提条件】
 * 1. 已在 Prisma Schema 中新建了 `UserPhoneHash` 表。
 * 2. 已经运行过 `pnpm db:generate` 及 `pnpm db:push` 将表结构同步到了数据库。
 * 3. 你已经将本脚本中的 `encryptPhone` 函数替换为你实际使用的加密算法。
 * 
 * 【执行方式】
 * 在项目根目录下通过 ts-node 运行（会自动读取你根目录的 .env 文件）：
 * $ npx ts-node scripts/ts/migrate-phone-hashes.ts
 * 
 * 【安全性保证】
 * 脚本采用了 `upsert` (存在即更新，不存在即插入) 的幂等设计，可随时中断并安全重复执行，不会产生脏数据。
 */
import { PrismaClient, Platform } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * TODO: 请在这里替换为你实际的加密算法和密钥
 * 这里的示例使用的是 HMAC-SHA256
 */
function encryptPhone(phone: string): string {
  // 1. 获取你在环境变量中存的密钥
  const secretKey = process.env.PHONE_ENCRYPTION_KEY || 'YOUR_SECRET_KEY';

  // 2. 如果你的业务逻辑里包含区号（如 +86138...），请根据实际情况拼接
  const phoneString = phone;

  // 3. 执行不可逆加密
  return crypto
    .createHmac('sha256', secretKey)
    .update(phoneString)
    .digest('hex'); // 腾讯会议一般是 hex 格式，如果是 base64 请修改
}

async function main() {
  console.log('🚀 开始迁移存量用户的手机号 Hash...');

  // 1. 查找所有填写了手机号的用户
  const usersWithPhone = await prisma.user.findMany({
    where: {
      phone: { not: null },
    },
    select: {
      id: true,
      phone: true,
    },
  });

  console.log(`🔍 找到了 ${usersWithPhone.length} 个带有手机号的用户。`);

  let successCount = 0;
  let errorCount = 0;

  // 2. 遍历用户，计算 Hash 并写入映射表
  for (const user of usersWithPhone) {
    if (!user.phone) continue;

    try {
      const hashValue = encryptPhone(user.phone);

      // 使用 upsert 防止重复运行脚本时报错
      await prisma.userPhoneHash.upsert({
        where: {
          hashValue: hashValue,
        },
        create: {
          userId: user.id,
          hashValue: hashValue,
          platform: Platform.TENCENT_MEETING, // 默认关联到腾讯会议
        },
        update: {
          userId: user.id, // 如果哈希已存在，确保它绑定的是正确的用户
        },
      });

      successCount++;
    } catch (error) {
      console.error(`❌ 处理用户 ${user.id} 时出错:`, error);
      errorCount++;
    }
  }

  console.log('✅ 迁移完成！');
  console.log(`📊 成功: ${successCount} | 失败: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error('脚本执行发生致命错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
