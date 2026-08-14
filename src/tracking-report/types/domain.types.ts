// ─── 用户 ID 组合对 ───────────────────────────────────────────────────────────

/** 双向解析后的用户 ID 组合对 */
export interface UserPair {
  subjectUserId: string;
  platformUserId: string;
}

// ─── 生成器相关类型 ────────────────────────────────────────────────────────────

/** 报告生成的源数据 */
export interface Source {
  id: string;
  content: string;
  userName: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  subjectUserId: string | null;
  platformUserId: string | null;
  kind: 'recording' | 'report';
}

export type GenerateProgressEvent =
  | { type: 'start'; totalUsers: number }
  | { type: 'success'; platformUserId: string | null }
  | { type: 'failure'; platformUserId: string | null; error: string };

export type GenerateProgressCallback = (
  event: GenerateProgressEvent,
) => void | Promise<void>;
