import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 起必须使用 prisma.config.ts（package.json#prisma 已废弃并将被移除）。
// Prisma CLI 不再自动加载 .env，因此这里显式引入 dotenv 来加载环境变量。
export default defineConfig({
  // 指向 prisma 目录：schema.prisma 与 prisma/models/*.prisma 会被递归合并。
  schema: 'prisma',
});
