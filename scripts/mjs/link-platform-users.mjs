/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 06:53:46
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-11 09:35:42
 * @FilePath: /nove_api/scripts/mjs/link-platform-users.mjs
 * @Description: This script links platform users to local users by matching display names
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkPlatformUsersToLocalUsers() {
  console.log('🔗 Starting to link platform users with local users...');

  const updated = await prisma.$executeRaw`
    UPDATE "user_platforms" pu
    SET "local_user_id" = u."id"
    FROM "users" u
    WHERE pu."local_user_id" IS NULL
    --   AND pu."deleted_at" IS NULL
    --   AND pu."active" = true
    --   AND u."deleted_at" IS NULL
    --   AND u."active" = true
    --   AND pu."country_code" IS NOT NULL
    --   AND pu."phone" IS NOT NULL
    --   AND u."country_code" IS NOT NULL
    --   AND u."phone" IS NOT NULL
    --   AND pu."country_code" = u."country_code"
    --   AND pu."phone" = u."phone"
         AND pu."display_name" = u."username"

  `;

  console.log(`✅ Update completed, ${updated} records updated`);
}

linkPlatformUsersToLocalUsers()
  .catch((error) => {
    console.error('❌ Linking failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
