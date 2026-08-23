/*
 * @FilePath: /nove_api/scripts/ts/migrate-to-generic-tracking-reports.ts
 * @Description: 数据迁移脚本，用于将旧的 user_tracking_reports 迁移为 Hub 模式的 tracking_targets 和 tracking_reports
 *
 * 运行方式:
 * pnpm dlx tsx scripts/ts/migrate-to-generic-tracking-reports.ts
 */

import {
  PrismaClient,
  TrackingTargetType,
  TrackingSourceType,
  TrackingReportCadence,
  TargetTrackingReportType,
  TrackingReportType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始迁移 Tracking Reports 数据...');

  // 1. 获取所有旧的追踪报告
  const oldReports = await prisma.userTrackingReport.findMany({
    include: {
      minuteSummarySources: true,
      sourceReports: true,
      derivedReports: true,
    },
  });

  console.log(`共找到 ${oldReports.length} 条需要迁移的数据。`);

  if (oldReports.length === 0) {
    console.log('没有需要迁移的数据。');
    return;
  }

  // 2. 遍历迁移数据
  let successCount = 0;
  let failCount = 0;

  for (const oldReport of oldReports) {
    try {
      // 确定 targetType 和 originalTargetId
      let targetType: TrackingTargetType;
      let targetId: string;

      if (oldReport.subjectUserId) {
        targetType = TrackingTargetType.USER;
        targetId = oldReport.subjectUserId;
      } else if (oldReport.platformUserId) {
        targetType = TrackingTargetType.PLATFORM_USER;
        targetId = oldReport.platformUserId;
      } else if (oldReport.projectId) {
        targetType = TrackingTargetType.PROJECT;
        targetId = oldReport.projectId;
      } else {
        console.warn(`报告 ${oldReport.id} 没有关联任何主体，跳过迁移。`);
        failCount++;
        continue;
      }

      // 使用事务来确保数据一致性
      await prisma.$transaction(async (tx) => {
        // 第一步：确保 TrackingTarget 存在 (Hub)
        const trackingTarget = await tx.trackingTarget.upsert({
          where: {
            targetType_targetId: {
              targetType,
              targetId,
            },
          },
          update: {
            // 如果存在，可以决定是否更新 nameSnapshot
            nameSnapshot: oldReport.subjectNameSnapshot,
          },
          create: {
            targetType,
            targetId,
            nameSnapshot: oldReport.subjectNameSnapshot,
            metadata: {}, // 可以扩展存入其他信息
          },
        });

        const trackingTypeMap: Record<
          TrackingReportType,
          TargetTrackingReportType
        > = {
          [TrackingReportType.PERIODIC_MEETING_SUMMARY]:
            TargetTrackingReportType.MEETING_SUMMARY,
          [TrackingReportType.TRAINING_PLAN]:
            TargetTrackingReportType.TRAINING_PLAN,
          [TrackingReportType.PROJECT_PROGRESS]:
            TargetTrackingReportType.PROJECT_PROGRESS,
          [TrackingReportType.USER_PROFILE]:
            TargetTrackingReportType.USER_PROFILE,
        };

        // 提取通用字段，并构造新的 TrackingReport 记录
        const newReportData = {
          id: oldReport.id, // 保持 ID 一致
          targetId: trackingTarget.id, // 使用真实的代理外键
          trackingType: trackingTypeMap[oldReport.trackingType],
          cadence: oldReport.cadence as string as TrackingReportCadence,
          periodStart: oldReport.periodStart,
          periodEnd: oldReport.periodEnd,
          timezone: oldReport.timezone,
          content: oldReport.content,
          generatedBy: oldReport.generatedBy,
          aiModel: oldReport.aiModel,
          createdAt: oldReport.createdAt,
          updatedAt: oldReport.updatedAt,
          deletedAt: oldReport.deletedAt,
        };

        // 插入主报告表
        await tx.trackingReport.create({
          data: newReportData,
        });

        // 迁移 MinuteSummarySources 关联表
        if (oldReport.minuteSummarySources.length > 0) {
          await tx.trackingReportSource.createMany({
            data: oldReport.minuteSummarySources.map((source) => ({
              id: source.id,
              reportId: source.reportId,
              sourceType: TrackingSourceType.SPEAKER_SUMMARY,
              sourceId: source.minuteSummaryId,
              metadata: source.metadata as object,
              createdAt: source.createdAt,
            })),
            skipDuplicates: true,
          });
        }

        // 迁移 SourceReports 关联表
        if (oldReport.sourceReports.length > 0) {
          await tx.trackingReportSource.createMany({
            data: oldReport.sourceReports.map((source) => ({
              id: source.id,
              reportId: source.reportId,
              sourceType: TrackingSourceType.TRACKING_REPORT,
              sourceId: source.sourceReportId,
              metadata: source.metadata as object,
              createdAt: source.createdAt,
            })),
            skipDuplicates: true,
          });
        }
      });

      successCount++;
      if (successCount % 100 === 0) {
        console.log(`已成功迁移 ${successCount} 条记录...`);
      }
    } catch (error) {
      console.error(`迁移报告 ${oldReport.id} 失败:`, error);
      failCount++;
    }
  }

  console.log('数据迁移完成！');
  console.log(`成功: ${successCount}`);
  console.log(`失败/跳过: ${failCount}`);
}

main()
  .catch((e) => {
    console.error('迁移脚本执行出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
