import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
    SELECT tablename AS name FROM pg_tables
    WHERE schemaname = current_schema()
      AND tablename IN ('participant_summaries', 'recording_participant_summaries', 'user_tracking_reports')
  `);
  const names = new Set(tables.map((table) => table.name));
  if (names.has('participant_summaries')) {
    const [rows, relationAnomalies] = await Promise.all([
      prisma.$queryRawUnsafe(`
      SELECT period_type, count(*)::int AS total,
        count(*) FILTER (WHERE platform_user_id IS NULL)::int AS missing_platform_user,
        count(*) FILTER (WHERE period_type = 'SINGLE' AND (meeting_id IS NULL OR meeting_recording_id IS NULL))::int AS invalid_single,
        count(*) FILTER (WHERE period_type <> 'SINGLE' AND (period_start IS NULL OR period_end IS NULL))::int AS invalid_period
      FROM participant_summaries GROUP BY period_type ORDER BY period_type
    `),
      prisma.$queryRawUnsafe(`
        SELECT count(*) FILTER (WHERE p.period_type = c.period_type)::int AS equal_rank
        FROM summary_relations r
        JOIN participant_summaries p ON p.id = r.parent_summary_id
        JOIN participant_summaries c ON c.id = r.child_summary_id
        WHERE r.deleted_at IS NULL
      `),
    ]);
    console.log(
      JSON.stringify({ phase: 'legacy', rows, relationAnomalies }, null, 2),
    );
    return;
  }
  const [summaryGroups, reportGroups] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS invalid_groups FROM (SELECT version_group_key FROM recording_participant_summaries WHERE deleted_at IS NULL AND is_latest GROUP BY version_group_key HAVING count(*) <> 1) groups`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS invalid_groups FROM (SELECT version_group_key FROM user_tracking_reports WHERE deleted_at IS NULL AND is_latest GROUP BY version_group_key HAVING count(*) <> 1) groups`,
    ),
  ]);
  console.log(
    JSON.stringify({ phase: 'split', summaryGroups, reportGroups }, null, 2),
  );
}

async function run() {
  try {
    await main();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
