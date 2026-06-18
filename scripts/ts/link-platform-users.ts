/**
 * @file link-platform-users.ts
 * @description 平台用户与本地用户关联脚本 (One-off Migration Script)
 * 
 * 【背景】
 * 在同步或接收第三方平台（如腾讯会议）的回调时，平台用户（PlatformUser）会带有 `phoneHash`，
 * 但尚未与本地 `User` 建立关联（`localUserId` 为空）。
 * 本脚本通过 `UserPhoneHash` 表中的 `hashValue`，将 `PlatformUser` 和 `User` 关联起来。
 * 
 * 【执行方式】
 * 在项目根目录下通过 ts-node 运行：
 * $ npx ts-node scripts/ts/link-platform-users.ts
 */
import { PrismaClient, Platform } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始关联 PlatformUser 和本地 User...');

  // 1. 查找所有腾讯会议平台且存在 phoneHash 但尚未关联本地用户的记录，且排除已有 ptUserId 的数据
  const platformUsers = await prisma.platformUser.findMany({
    where: {
      platform: Platform.TENCENT_MEETING,
      phoneHash: { not: null },
      localUserId: null,
      ptUserId: null,
    },
    select: {
      id: true,
      phoneHash: true,
    },
  });

  console.log(`🔍 找到了 ${platformUsers.length} 个带有 phoneHash 且尚未关联本地用户的腾讯会议用户。`);

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  // 2. 遍历平台用户，通过 UserPhoneHash 匹配本地用户 ID 并进行关联
  for (const ptUser of platformUsers) {
    if (!ptUser.phoneHash) continue;

    try {
      // 查找对应的 Hash 映射记录
      const phoneHashRecord = await prisma.userPhoneHash.findUnique({
        where: {
          hashValue: ptUser.phoneHash,
        },
        select: {
          userId: true,
        },
      });

      if (phoneHashRecord && phoneHashRecord.userId) {
        // 找到了对应的本地用户，进行关联
        await prisma.platformUser.update({
          where: { id: ptUser.id },
          data: { localUserId: phoneHashRecord.userId },
        });
        successCount++;
      } else {
        // 未找到匹配的本地用户（可能是本地还没这个用户或者没跑过 Hash 迁移脚本）
        notFoundCount++;
      }
    } catch (error) {
      console.error(`❌ 处理平台用户 ${ptUser.id} 时出错:`, error);
      errorCount++;
    }
  }

  console.log('✅ 关联操作执行完成！');
  console.log(`📊 成功关联: ${successCount} | 未找到匹配: ${notFoundCount} | 失败异常: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error('脚本执行发生致命错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
